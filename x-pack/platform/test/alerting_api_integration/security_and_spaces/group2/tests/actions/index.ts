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

    loadTestFile(require.resolve('./get_connector_spec'));

    // Connector types A-P (first ~15 alphabetically)
    loadTestFile(require.resolve('./connector_types/bedrock'));
    loadTestFile(require.resolve('./connector_types/cases_webhook'));
    loadTestFile(require.resolve('./connector_types/d3security'));
    loadTestFile(require.resolve('./connector_types/email'));
    loadTestFile(require.resolve('./connector_types/es_index'));
    loadTestFile(require.resolve('./connector_types/es_index_preconfigured'));
    loadTestFile(require.resolve('./connector_types/gemini'));
    loadTestFile(require.resolve('./connector_types/get_webhook_secret_headers_keys'));
    loadTestFile(require.resolve('./connector_types/http'));
    loadTestFile(require.resolve('./connector_types/jira'));
    loadTestFile(require.resolve('./connector_types/jira_service_management'));
    loadTestFile(require.resolve('./connector_types/oauth_access_token'));
    loadTestFile(require.resolve('./connector_types/oauth_start_flow'));
    loadTestFile(require.resolve('./connector_types/oauth_callback'));
    loadTestFile(require.resolve('./connector_types/oauth_full_flow'));
    loadTestFile(require.resolve('./connector_types/oauth_security'));
    loadTestFile(require.resolve('./connector_types/oauth_disconnect'));
    loadTestFile(require.resolve('./connector_types/openai'));
    loadTestFile(require.resolve('./connector_types/opsgenie'));
    loadTestFile(require.resolve('./connector_types/pagerduty'));
  });
}
