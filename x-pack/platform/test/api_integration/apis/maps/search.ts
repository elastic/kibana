/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { SEARCH_API_BASE_URL } from '@kbn/data-plugin/server/search/routes';
import { ESQL_SEARCH_STRATEGY } from '@kbn/data-plugin/common';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe.only('search', () => {
    describe('ES|QL', () => {
      it(`should return getColumns response in expected shape`, async () => {
        const resp = await supertest
          .post(`${SEARCH_API_BASE_URL}/${ESQL_SEARCH_STRATEGY}`)
          .set('kbn-xsrf', 'kibana')
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .send({
            params: {
              query: 'from logstash-* | keep geo.coordinates | limit 0',
            },
          })
          .expect(200);

        const { took, ...response } = resp.body.rawResponse;
        expect(response).to.eql({
          columns: [
            {
              name: 'geo.coordinates',
              type: 'geo_point',
            },
          ],
          documents_found: 0,
          is_partial: false,
          values: [],
          values_loaded: 0
        });
      });

      it(`should return getValues response in expected shape`, async () => {
        const resp = await supertest
          .post(`${SEARCH_API_BASE_URL}/${ESQL_SEARCH_STRATEGY}`)
          .set('kbn-xsrf', 'kibana')
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .send({
            params: {
              dropNullColumns: true,
              query:
                'from logstash-* | keep geo.coordinates, @timestamp | sort @timestamp | limit 1',
            },
          })
          .expect(200);

        const { took, ...response } = resp.body.rawResponse;
        expect(response).to.eql({
          all_columns: [
            {
              name: 'geo.coordinates',
              type: 'geo_point',
            },
            {
              name: '@timestamp',
              type: 'date',
            },
          ],
          columns: [
            {
              name: 'geo.coordinates',
              type: 'geo_point',
            },
            {
              name: '@timestamp',
              type: 'date',
            },
          ],
          documents_found: 3,
          is_partial: false,
          values: [['POINT (-120.9871642 38.68407028)', '2015-09-20T00:00:00.000Z']],
          values_loaded: 6
        });
      });
    });
  });
}
