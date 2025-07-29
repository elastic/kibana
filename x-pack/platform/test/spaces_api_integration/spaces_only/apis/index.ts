/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../common/ftr_provider_context';

export default function spacesOnlyTestSuite({ loadTestFile }: FtrProviderContext) {
  describe('spaces api without security', function () {
    this.tags('skipFIPS');
    loadTestFile(require.resolve('./get_shareable_references'));
    loadTestFile(require.resolve('./update_objects_spaces'));
    loadTestFile(require.resolve('./disable_legacy_url_aliases'));
  });
}
