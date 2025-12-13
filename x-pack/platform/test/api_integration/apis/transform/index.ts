/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const transform = getService('transform');

  describe('transform', function () {
    this.tags(['transform']);

    before(async () => {
      await transform.securityCommon.createTransformRoles();
      await transform.securityCommon.createTransformUsers();
    });

    after(async () => {
      await transform.securityCommon.cleanTransformUsers();
      await transform.securityCommon.cleanTransformRoles();

      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/ml/farequote');

      await transform.testResources.resetKibanaTimeZone();
    });

    // The majority of transform tests was moved to Scout, see x-pack/platform/plugins/private/transform/test/scout/api/playwright.config.ts
    loadTestFile(require.resolve('./reauthorize_transforms'));
  });
}
