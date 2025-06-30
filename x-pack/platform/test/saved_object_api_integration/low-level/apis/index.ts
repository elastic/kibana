/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const config = getService('config');
  const basic = config.get('esTestCluster.license') === 'basic';

  describe('low-level', function () {
    if (basic) {
      this.tags('skipFIPS');
    }

    loadTestFile(require.resolve('./bulk_update'));
  });
}
