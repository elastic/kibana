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

    loadTestFile(require.resolve('./connector_types/webhook'));
    loadTestFile(require.resolve('./connector_types/http'));
    loadTestFile(require.resolve('./connector_types/xmatters'));
    loadTestFile(require.resolve('./connector_types/tines'));
    loadTestFile(require.resolve('./connector_types/torq'));
    loadTestFile(require.resolve('./connector_types/openai'));
    loadTestFile(require.resolve('./connector_types/d3security'));
    loadTestFile(require.resolve('./connector_types/thehive'));
    loadTestFile(require.resolve('./connector_types/bedrock'));
    loadTestFile(require.resolve('./connector_types/gemini'));
    loadTestFile(require.resolve('./connector_types/xsoar'));
    loadTestFile(require.resolve('./connector_types/get_webhook_secret_headers_keys'));
    loadTestFile(require.resolve('./create'));
    loadTestFile(require.resolve('./delete'));
    loadTestFile(require.resolve('./execute'));
    loadTestFile(require.resolve('./get_all'));
    loadTestFile(require.resolve('./get_all_system'));
  });
}
