/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAvailableConnectors } from '@kbn/gen-ai-functional-testing';
import { FtrProviderContext } from '../ftr_provider_context';
import { chatCompleteSuite } from './chat_complete';

// eslint-disable-next-line import/no-default-export
export default function (providerContext: FtrProviderContext) {
  describe('Inference plugin - API integration tests', async () => {
    getAvailableConnectors().forEach((connector) => {
      describe(`Connector ${connector.id}`, () => {
        chatCompleteSuite(connector, providerContext);
      });
    });
  });
}
