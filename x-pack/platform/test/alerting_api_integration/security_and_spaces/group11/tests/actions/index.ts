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

    // Connector types R-T (resilient through torq)
    loadTestFile(require.resolve('../../../group2/tests/actions/connector_types/resilient'));
    loadTestFile(require.resolve('../../../group2/tests/actions/connector_types/server_log'));
    loadTestFile(require.resolve('../../../group2/tests/actions/connector_types/servicenow_itom'));
    loadTestFile(require.resolve('../../../group2/tests/actions/connector_types/servicenow_itsm'));
    loadTestFile(require.resolve('../../../group2/tests/actions/connector_types/servicenow_sir'));
    loadTestFile(require.resolve('../../../group2/tests/actions/connector_types/slack_api'));
    loadTestFile(require.resolve('../../../group2/tests/actions/connector_types/slack_webhook'));
    loadTestFile(require.resolve('../../../group2/tests/actions/connector_types/swimlane'));
    loadTestFile(require.resolve('../../../group2/tests/actions/connector_types/thehive'));
    loadTestFile(require.resolve('../../../group2/tests/actions/connector_types/tines'));
    loadTestFile(require.resolve('../../../group2/tests/actions/connector_types/torq'));
  });
}
