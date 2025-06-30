/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  describe('visualizations - create', () => {
    before(async () => {
      await kibanaServer.importExport.load(
        'src/platform/test/api_integration/fixtures/kbn_archiver/saved_objects/basic.json'
      );
      await kibanaServer.importExport.load(
        'x-pack/test/api_integration/fixtures/kbn_archiver/lens/example_docs.json'
      );
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.unload(
        'src/platform/test/api_integration/fixtures/kbn_archiver/saved_objects/basic.json'
      );
      await kibanaServer.importExport.unload(
        'x-pack/test/api_integration/fixtures/kbn_archiver/lens/example_docs.json'
      );
    });
    loadTestFile(require.resolve('./main'));
  });
}
