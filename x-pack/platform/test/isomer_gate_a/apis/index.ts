/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { ChartData } from '@kbn/isomer';
import {
  EDGE_CASE_INDEX,
  EDGE_CASE_MAPPINGS,
  SAMPLE_DATA_SETS,
  buildEdgeCaseDocuments,
  compareTables,
  datatableFromChartData,
  kibanaTables,
  listGateCases,
} from '@kbn/isomer-gate-a';
import type { FtrProviderContext } from '../../api_integration/ftr_provider_context';

const MATERIALIZE_PATH = '/api/isomer/materialize';
const MATERIALIZE_API_VERSION = '2023-10-31';
const REORDERED = 'rows are the same, in a different order';

/** Whether any query the chart runs orders its rows. */
const hasSort = (config: Record<string, unknown>): boolean =>
  /\|\s*SORT\b/i.test(JSON.stringify(config));

export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');
  const log = getService('log');
  const supertest = getService('supertest');

  // The data is the same in both color modes, so each panel is checked once.
  const cases = listGateCases().filter(({ theme }) => theme === 'light');

  describe('Isomer Gate A-data', function () {
    before(async () => {
      // The corpus was captured at one `now`; sample data is installed relative to it.
      const nows = new Set(cases.map(({ fixture }) => fixture.context.now));
      expect(nows.size).to.be(1);
      const [now] = nows;
      for (const dataSet of SAMPLE_DATA_SETS) {
        await supertest.delete(`/api/sample_data/${dataSet}`).set('kbn-xsrf', 'true');
        await supertest
          .post(`/api/sample_data/${dataSet}`)
          .query({ now })
          .set('kbn-xsrf', 'true')
          .expect(200);
      }
      await es.indices.delete({ index: EDGE_CASE_INDEX, ignore_unavailable: true });
      await es.indices.create({ index: EDGE_CASE_INDEX, mappings: EDGE_CASE_MAPPINGS });
      await es.bulk({
        refresh: 'wait_for',
        operations: buildEdgeCaseDocuments().flatMap((document) => [
          { index: { _index: EDGE_CASE_INDEX } },
          document,
        ]),
      });
    });

    after(async () => {
      for (const dataSet of SAMPLE_DATA_SETS) {
        await supertest.delete(`/api/sample_data/${dataSet}`).set('kbn-xsrf', 'true');
      }
      await es.indices.delete({ index: EDGE_CASE_INDEX, ignore_unavailable: true });
    });

    for (const gateCase of cases) {
      it(`${gateCase.name.replace(/\/light$/, '')} queries the table Kibana drew`, async () => {
        const { fixture, config } = gateCase;
        const { body } = await supertest
          .post(MATERIALIZE_PATH)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', MATERIALIZE_API_VERSION)
          .send({
            input: { type: 'lens', config },
            context: {
              time_range: fixture.context.time_range.absolute,
              time_zone: String(fixture.context.ui_settings['dateFormat:tz'] ?? 'UTC'),
            },
          })
          .expect(200);

        const [node] = body.body as Array<{ type: string; reason?: string; data?: ChartData }>;
        if (!node.data) {
          throw new Error(`${gateCase.name} materialized to ${node.type}: ${node.reason ?? ''}`);
        }
        const [expected] = kibanaTables(gateCase);
        const found = compareTables(expected, datatableFromChartData(node.data));
        // ES|QL returns rows in no particular order without SORT, in Kibana as here.
        const differences =
          !hasSort(config) && found.length === 1 && found[0] === REORDERED ? [] : found;
        if (differences.length > 0) {
          log.info(`${gateCase.name}:\n  ${differences.join('\n  ')}`);
        }
        expect(differences).to.eql([]);
      });
    }
  });
}
