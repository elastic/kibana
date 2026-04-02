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

    // Connector types W-Z (webhook, xmatters, xsoar)
    loadTestFile(require.resolve('../../../group2/tests/actions/connector_types/webhook'));
    loadTestFile(require.resolve('../../../group2/tests/actions/connector_types/xmatters'));
    loadTestFile(require.resolve('../../../group2/tests/actions/connector_types/xsoar'));

    // CRUD and utility action tests
    loadTestFile(require.resolve('../../../group2/tests/actions/create'));
    loadTestFile(require.resolve('../../../group2/tests/actions/delete'));
    loadTestFile(require.resolve('../../../group2/tests/actions/execute'));
    loadTestFile(require.resolve('../../../group2/tests/actions/get_all'));
    loadTestFile(require.resolve('../../../group2/tests/actions/get_all_system'));
    loadTestFile(require.resolve('../../../group2/tests/actions/get'));
    loadTestFile(require.resolve('../../../group2/tests/actions/connector_types'));
    loadTestFile(require.resolve('../../../group2/tests/actions/connector_types_system'));
    loadTestFile(require.resolve('../../../group2/tests/actions/update'));
    loadTestFile(require.resolve('../../../group2/tests/actions/bulk_enqueue'));
    loadTestFile(require.resolve('../../../group2/tests/actions/sub_feature_descriptions'));
    loadTestFile(require.resolve('../../../group2/tests/actions/sub_action_framework'));
  });
}
