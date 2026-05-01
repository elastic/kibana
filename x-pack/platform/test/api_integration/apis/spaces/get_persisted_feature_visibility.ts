/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const spacesService = getService('spaces');

  describe('GET /internal/spaces/space/{id}/persisted_feature_visibility', () => {
    before(async () => {
      await spacesService.create({
        id: 'classic-space',
        name: 'Classic Space',
        disabledFeatures: ['feature_1', 'feature_2'],
        solution: 'classic',
      });

      await spacesService.create({
        id: 'solution-space',
        name: 'Solution Space',
        disabledFeatures: ['feature_3', 'feature_4'],
        solution: 'es',
      });
    });

    after(async () => {
      await spacesService.delete('classic-space');
      await spacesService.delete('solution-space');
    });

    it('returns stored disabledFeatures for a classic space', async () => {
      await supertest
        .get('/internal/spaces/space/classic-space/persisted_feature_visibility')
        .set('kbn-xsrf', 'xxx')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .expect(200)
        .then((response) => {
          expect(response.body).to.eql({
            featureVisibility: { disabledFeatures: ['feature_1', 'feature_2'] },
          });
        });
    });

    it('returns stored disabledFeatures for a space with a non-classic solution view', async () => {
      await supertest
        .get('/internal/spaces/space/solution-space/persisted_feature_visibility')
        .set('kbn-xsrf', 'xxx')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .expect(200)
        .then((response) => {
          expect(response.body).to.eql({
            featureVisibility: { disabledFeatures: ['feature_3', 'feature_4'] },
          });
        });
    });

    it('returns 404 when the space is not found', async () => {
      await supertest
        .get('/internal/spaces/space/not-found-space/persisted_feature_visibility')
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
