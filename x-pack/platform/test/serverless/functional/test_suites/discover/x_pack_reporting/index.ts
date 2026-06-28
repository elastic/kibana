/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

<<<<<<<< HEAD:x-pack/platform/test/serverless/functional/test_suites/discover/x_pack_reporting/index.ts
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('discover', function () {
    this.tags(['esGate']);

    loadTestFile(require.resolve('./reporting'));
  });
========
export class EntityStoreNotInstalledError extends Error {
  constructor() {
    super(
      'Entity Store is not installed. Install it via POST /api/security/entity_store/install or from the Security Entity Store page, then retry.'
    );
  }
>>>>>>>> 9.4:x-pack/solutions/security/plugins/entity_store/server/domain/errors/entity_store_not_installed.ts
}
