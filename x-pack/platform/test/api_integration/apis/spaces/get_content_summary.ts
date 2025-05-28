/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import { FtrProviderContext } from '../../ftr_provider_context';

const sampleDashboard = {
  contentTypeId: 'dashboard',
  data: {
    kibanaSavedObjectMeta: {},
    title: 'Sample dashboard',
  },
  options: {
    references: [],
    overwrite: true,
  },
  version: 2,
};

const sampleIndexPattern = {
  contentTypeId: 'index-pattern',
  data: {
    fieldAttrs: '{}',
    title: 'index-pattern-1',
    timeFieldName: '@timestamp',
    sourceFilters: '[]',
    fields: '[]',
    fieldFormatMap: '{}',
    typeMeta: '{}',
    runtimeFieldMap: '{}',
    name: 'index-pattern-1',
  },
  options: { id: 'index-pattern-1' },
  version: 1,
};

const ATestSpace = 'ab-space';
const BTestSpace = 'ac-space';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const spacesService = getService('spaces');

  describe('GET /internal/spaces/{spaceId}/content_summary', () => {
    before(async () => {
      await spacesService.create({
        id: ATestSpace,
        name: 'AB Space',
        disabledFeatures: [],
        color: '#AABBCC',
      });

      await spacesService.create({
        id: BTestSpace,
        name: 'AC Space',
        disabledFeatures: [],
        color: '#AABBCC',
      });
    });

    after(async () => {
      await spacesService.delete('ab-space');
      await spacesService.delete('ac-space');
    });

    it(`returns content summary for ${ATestSpace} space`, async () => {
      await supertest
        .post(`/s/${ATestSpace}/api/content_management/rpc/create`)
        .set('kbn-xsrf', 'xxx')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send(sampleDashboard);

      await supertest
        .post(`/s/${ATestSpace}/api/content_management/rpc/create`)
        .set('kbn-xsrf', 'xxx')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send(sampleDashboard);

      await supertest
        .get(`/internal/spaces/${ATestSpace}/content_summary`)
        .set('kbn-xsrf', 'xxx')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .expect(200)
        .then((response) => {
          const { summary, total } = response.body;
          expect(summary).to.eql([
            {
              count: 2,
              type: 'dashboard',
              displayName: 'Dashboard',
              icon: 'dashboardApp',
            },
          ]);
          expect(total).to.eql(2);
        });
    });

    it(`returns content summary for ${BTestSpace} space`, async () => {
      await supertest
        .post(`/s/${BTestSpace}/api/content_management/rpc/create`)
        .set('kbn-xsrf', 'xxx')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send(sampleDashboard);

      await supertest
        .post(`/s/${BTestSpace}/api/content_management/rpc/create`)
        .set('kbn-xsrf', 'foo')
        .set('x-elastic-internal-origin', 'foo')
        .send(sampleIndexPattern);

      await supertest
        .get(`/internal/spaces/${BTestSpace}/content_summary`)
        .set('kbn-xsrf', 'xxx')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .expect(200)
        .then((response) => {
          const { summary, total } = response.body;
          expect(summary).to.eql([
            {
              count: 1,
              type: 'dashboard',
              displayName: 'Dashboard',
              icon: 'dashboardApp',
            },
            {
              count: 1,
              displayName: 'data view',
              icon: 'indexPatternApp',
              type: 'index-pattern',
            },
          ]);

          expect(total).to.eql(2);
        });
    });

    it('returns 404 when the space is not found', async () => {
      await supertest
        .get('/internal/spaces/not-found-space/content_summary')
        .set('kbn-xsrf', 'xxx')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .expect(404, {
          statusCode: 404,
          error: 'Not Found',
          message: 'Not Found',
        });
    });
  });
}
