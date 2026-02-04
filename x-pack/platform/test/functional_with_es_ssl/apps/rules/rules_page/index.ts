/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../ftr_provider_context';
import { ObjectRemover } from '../../../lib/object_remover';

export default ({ getPageObjects, getService, loadTestFile }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const objectRemover = new ObjectRemover(supertest);

  describe('Rules page', function () {
    before(async () => {
      // Clean up saved objects to ensure a clean state
      await kibanaServer.savedObjects.cleanStandardList();
    });

    after(async () => {
      // Clean up any objects tracked by ObjectRemover
      await objectRemover.removeAll();
    });

    loadTestFile(require.resolve('./create_rule_flow'));
    loadTestFile(require.resolve('./edit_rule_flow'));
    loadTestFile(require.resolve('./page_navigation_and_loading'));
    loadTestFile(require.resolve('./tab_functionality'));
  });
};
