/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../api_integration/ftr_provider_context';

export default function ({ loadTestFile, getService }: FtrProviderContext) {
  describe('OneChat Endpoints', function () {
    const kibanaServer = getService('kibanaServer');

    before(async () => {
      await kibanaServer.uiSettings.update({
        'onechat:api:enabled': true,
      });
    });
    loadTestFile(require.resolve('./esql_tools.ts'));
  });
}
