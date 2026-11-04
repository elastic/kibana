/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SAMPLE_DATA_SETS,
  capturePaths,
  createCaptureWriter,
  diffJson,
  diffLensAttributes,
  flattenAsCodePanels,
  renderRoundTripReport,
} from '@kbn/isomer-corpus';
import type {
  AsCodePanel,
  AsCodePanelEntry,
  RoundTripDashboardResult,
  RoundTripPanelResult,
} from '@kbn/isomer-corpus';
import type { FtrProviderContext } from '../../functional/ftr_provider_context';
import { AS_CODE_API_VERSION, getRunSettings, installSampleData } from './corpus_run';

const DASHBOARD_APP_API_PATH = '/internal/dashboards/app';
const DASHBOARD_APP_API_VERSION = '1';
const LENS_PANEL_TYPE = 'vis';

const omit = (value: Record<string, unknown>, key: string) => {
  const { [key]: _omitted, ...rest } = value;
  return rest;
};

export default function ({ getService }: FtrProviderContext) {
  const log = getService('log');
  const supertest = getService('supertest');

  const { now, outputRoot, onlyDashboards } = getRunSettings();
  const writer = createCaptureWriter(outputRoot);

  /** The dashboard as the dashboard app reads it: Lens panels as migrated stored state. */
  const readStored = async (id: string) =>
    (
      await supertest
        .get(`${DASHBOARD_APP_API_PATH}/${id}`)
        .set('elastic-api-version', DASHBOARD_APP_API_VERSION)
        .set('x-elastic-internal-origin', 'kibana')
        .expect(200)
    ).body;

  /** The dashboard in the as-code format. */
  const readApi = async (id: string) =>
    (
      await supertest
        .get(`/api/dashboards/${id}`)
        .set('elastic-api-version', AS_CODE_API_VERSION)
        .expect(200)
    ).body;

  const byId = (panels: AsCodePanel[]) => new Map(panels.map((panel) => [panel.id, panel]));

  const compareDashboard = async (name: string, id: string): Promise<RoundTripDashboardResult> => {
    const copyId = `isomer-corpus-round-trip-${name}`;
    const stored = await readStored(id);
    const api = await readApi(id);

    const { title, ...data } = api.data;
    await supertest
      .put(`/api/dashboards/${copyId}`)
      .set('kbn-xsrf', 'true')
      .set('elastic-api-version', AS_CODE_API_VERSION)
      .send({ ...data, title: `${title} (round trip)` })
      .expect(({ status, body }) => {
        if (status !== 200 && status !== 201) {
          throw new Error(
            `Writing the round-trip copy returned ${status}: ${JSON.stringify(body)}`
          );
        }
      });

    try {
      const storedAfter = byId(
        flattenAsCodePanels((await readStored(copyId)).data.panels as AsCodePanelEntry[])
      );
      const apiBefore = byId(flattenAsCodePanels(api.data.panels as AsCodePanelEntry[]));
      const apiAfter = byId(
        flattenAsCodePanels((await readApi(copyId)).data.panels as AsCodePanelEntry[])
      );

      const panels = flattenAsCodePanels(stored.data.panels as AsCodePanelEntry[])
        .filter(({ type }) => type === LENS_PANEL_TYPE)
        .map((panel): RoundTripPanelResult => {
          const { attributes } = panel.config as { attributes?: Record<string, unknown> };
          const apiConfig = apiBefore.get(panel.id)?.config;
          const after = storedAfter.get(panel.id)?.config as
            | { attributes?: Record<string, unknown> }
            | undefined;
          const result = {
            dashboard: name,
            panelId: panel.id,
            title:
              (typeof panel.config.title === 'string' ? panel.config.title : undefined) ??
              (typeof attributes?.title === 'string' ? attributes.title : null),
            visualizationType:
              typeof attributes?.visualizationType === 'string'
                ? attributes.visualizationType
                : null,
            chartType: typeof apiConfig?.type === 'string' ? apiConfig.type : null,
            attributes: [],
            panel: [],
            api: [],
          };
          if (!attributes) {
            return { ...result, status: 'by_reference' };
          }
          if (!after?.attributes) {
            return { ...result, status: 'missing_after_round_trip' };
          }
          return {
            ...result,
            status: 'compared',
            attributes: diffLensAttributes(attributes, after.attributes),
            panel: diffJson(
              JSON.parse(JSON.stringify(omit(panel.config, 'attributes'))),
              JSON.parse(JSON.stringify(omit(after, 'attributes')))
            ),
            api: diffJson(
              JSON.parse(JSON.stringify(apiConfig ?? {})),
              JSON.parse(JSON.stringify(apiAfter.get(panel.id)?.config ?? {}))
            ),
          };
        });

      return {
        name,
        id,
        dropped: (api.warnings ?? [])
          .filter(({ type }: { type: string }) => type === 'dropped_panel')
          .map(({ panel_type: panelType, message }: { panel_type: string; message: string }) => ({
            panelType,
            message,
          })),
        panels,
      };
    } finally {
      await supertest
        .delete(`/api/dashboards/${copyId}`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', AS_CODE_API_VERSION);
    }
  };

  describe('round trip', function () {
    let sampleDashboardIds: Map<string, string>;

    before(async () => {
      sampleDashboardIds = await installSampleData(supertest, now, { reinstall: false });
    });

    it('lists the Lens fields the sample dashboards lose through the API format', async () => {
      const results: RoundTripDashboardResult[] = [];
      for (const dataSet of SAMPLE_DATA_SETS) {
        const name = `sample-${dataSet}`;
        const id = sampleDashboardIds.get(dataSet);
        if (onlyDashboards && !onlyDashboards.includes(name)) {
          continue;
        }
        if (!id) {
          throw new Error(`No dashboard ID for ${name}`);
        }
        const result = await compareDashboard(name, id);
        writer.writeJson(capturePaths.roundTrip(name), result);
        results.push(result);
        log.info(
          `[${name}] ${result.panels.length} Lens panels, ${
            result.panels.filter(({ attributes, panel }) => attributes.length + panel.length > 0)
              .length
          } with stored differences`
        );
      }

      if (!onlyDashboards) {
        const { body: status } = await supertest.get('/api/status').expect(200);
        writer.writeText(
          capturePaths.roundTripReport(),
          renderRoundTripReport(results, { kibanaVersion: status.version?.number ?? 'unknown' })
        );
      }
    });
  });
}
