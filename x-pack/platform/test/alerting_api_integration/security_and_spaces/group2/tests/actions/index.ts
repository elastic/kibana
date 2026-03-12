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

    loadTestFile(require.resolve('./connector_types/oauth_access_token'));
    loadTestFile(require.resolve('./connector_types/cases_webhook'));
    loadTestFile(require.resolve('./connector_types/jira'));
    loadTestFile(require.resolve('./connector_types/jira_service_management'));
    loadTestFile(require.resolve('./connector_types/resilient'));
    loadTestFile(require.resolve('./connector_types/servicenow_itsm'));
    loadTestFile(require.resolve('./connector_types/servicenow_sir'));
    loadTestFile(require.resolve('./connector_types/servicenow_itom'));
    loadTestFile(require.resolve('./connector_types/swimlane'));
    loadTestFile(require.resolve('./connector_types/email'));
    loadTestFile(require.resolve('./connector_types/es_index'));
    loadTestFile(require.resolve('./connector_types/es_index_preconfigured'));
    loadTestFile(require.resolve('./connector_types/opsgenie'));
    loadTestFile(require.resolve('./connector_types/pagerduty'));
    loadTestFile(require.resolve('./connector_types/server_log'));
  });
}
