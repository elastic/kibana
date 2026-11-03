/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../common/ftr_provider_context';

export default ({ loadTestFile }: FtrProviderContext): void => {
  describe('cases custom statuses', function () {
    loadTestFile(require.resolve('./space_settings'));
    loadTestFile(require.resolve('./status_writes'));
    loadTestFile(require.resolve('./find_by_status_key'));
  });
};
