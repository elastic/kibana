/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { setupSpacesAndUsers, tearDown } from '../../../setup';

export default function connectorsTests({ loadTestFile, getService }: FtrProviderContext) {
  describe('Connectors', () => {
    before(async () => {
      await setupSpacesAndUsers(getService);
    });

    after(async () => {
      await tearDown(getService);
    });

    loadTestFile(require.resolve('./connector_types'));
    loadTestFile(require.resolve('./connector_types_system'));
    loadTestFile(require.resolve('./update'));
    loadTestFile(require.resolve('./bulk_enqueue'));
    loadTestFile(require.resolve('./sub_feature_descriptions'));

    /**
     * Sub action framework
     */

    loadTestFile(require.resolve('./sub_action_framework'));
  });
}
