/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { createSpaces, deleteSpaces } from '../../../common/lib/authentication';

/**
 * Suite wrapper for the cases-analytics v2 flag-off regression guard. Runs
 * under `config_analytics_v2_off.ts`, which pins
 * `xpack.cases.analyticsV2.enabled=false`.
 *
 * The guard test authenticates as super user in `space1` (see
 * `getAuthWithSuperUser`), so the spaces must be created here — this config
 * does not load the main `tests/trial/index.ts` that would otherwise seed them.
 */
export default ({ loadTestFile, getService }: FtrProviderContext): void => {
  describe('cases spaces only enabled: trial - analytics v2 off', function () {
    this.tags('skipFIPS');

    before(async () => {
      await createSpaces(getService);
    });

    after(async () => {
      await deleteSpaces(getService);
    });

    loadTestFile(require.resolve('./analytics_v2_off'));
  });
};
