/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAvailableConnectors, takeRandomLlmSample } from '@kbn/gen-ai-functional-testing';
import type { FtrProviderContext } from '../ftr_provider_context';
import { chatCompleteSuite } from './chat_complete';
import { productDocsBaseInstallationSuite } from './product_docs_base';

// eslint-disable-next-line import/no-default-export
export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const log = getService('log');
  const allConnectors = getAvailableConnectors();
  const connectors = takeRandomLlmSample(allConnectors);

  describe('Inference plugin - API integration tests', () => {
    before(() => {
      log.info(
        `[FTR] Inference gen-ai — connectors (${connectors.length}/${
          allConnectors.length
        }): ${connectors.map((c) => c.id).join(', ')}`
      );
    });

    connectors.forEach((connector) => {
      describe(`Connector ${connector.id}`, () => {
        chatCompleteSuite(connector, providerContext);
      });
    });

    const firstConnector = connectors[0];
    productDocsBaseInstallationSuite(firstConnector, providerContext);
  });
}
