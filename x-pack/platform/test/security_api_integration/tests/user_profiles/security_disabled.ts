/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';

import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('Getting user profile when security is disabled in Elasticsearch', function () {
    this.tags('skipFIPS');

    it('returns 404 for unauthenticated requests', async () => {
      await supertestWithoutAuth
        .get('/internal/security/user_profile')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .expect(404);
    });

    it('returns 404 for basic auth requests', async () => {
      await supertestWithoutAuth
        .get('/internal/security/user_profile')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .set('Authorization', `Basic ${Buffer.from('elastic:changeme').toString('base64')}`)
        .expect(404);
    });
  });
}
