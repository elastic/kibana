/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../ftr_provider_context';

/**
 * Legacy (templates flag OFF) Cases group2 suite.
 *
 * Runs only the legacy in-page custom-fields / templates coverage, which is
 * valid exclusively when `xpack.cases.templates.enabled` is OFF. The default
 * group2 suite (flag ON) is defined in `index.ts`.
 */
export default ({ loadTestFile }: FtrProviderContext) => {
  describe('Cases - legacy templates', function () {
    loadTestFile(require.resolve('./configure_legacy'));
  });
};
