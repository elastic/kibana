/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { setupSpacesAndUsers, tearDown } from '../../../setup';

export default function alertingTests({ loadTestFile, getService }: FtrProviderContext) {
  describe('Alerts - Group 19', () => {
    describe('alerts', () => {
      before(async () => {
        await setupSpacesAndUsers(getService);
      });

      after(async () => {
        await tearDown(getService);
      });

      loadTestFile(require.resolve('./fields_rule'));
      loadTestFile(require.resolve('./get_flapping_settings'));
      loadTestFile(require.resolve('./run_soon'));
      loadTestFile(require.resolve('./suggestions_value_rule'));
      loadTestFile(require.resolve('./update_flapping_settings'));
    });
  });
}
