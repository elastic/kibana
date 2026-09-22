/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { createSpaces, deleteSpaces } from '../../../common/lib/authentication';

export default ({ loadTestFile, getService }: FtrProviderContext): void => {
  describe('cases spaces only enabled: trial', function () {
    this.tags('skipFIPS');
    before(async () => {
      await createSpaces(getService);
    });

    after(async () => {
      await deleteSpaces(getService);
    });

    loadTestFile(require.resolve('../common'));

    loadTestFile(require.resolve('./cases/push_case'));
    loadTestFile(require.resolve('./configure'));
    // NOTE: `./analytics_v2_off` is intentionally NOT loaded here. This config
    // does not pin `xpack.cases.analyticsV2.enabled`, so it follows the plugin
    // default (which may be ON). The flag-off regression guard instead runs
    // under its own `config_analytics_v2_off.ts`, which forces the flag to
    // `false` deterministically.
  });
};
