/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomBytes } from 'node:crypto';
import yargs from 'yargs/yargs';
import { ToolingLog } from '@kbn/tooling-log';
import axios from 'axios';
import {
  ConversationCreateProps,
  ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL,
} from '@kbn/elastic-assistant-common';
import { getCreateConversationSchemaMock } from '../server/__mocks__/conversations_schema.mock';

const getMockConversationContent = (): Partial<ConversationCreateProps> => ({
  title: `A ${randomBytes(4).toString('hex')} title`,
  isDefault: false,
  messages: [
    {
      content: 'Hello robot',
      role: 'user',
      timestamp: '2019-12-13T16:40:33.400Z',
      traceData: {
        traceId: '1',
        transactionId: '2',
      },
    },
    {
      content: 'Hello human',
      role: 'assistant',
      timestamp: '2019-12-13T16:41:33.400Z',
      traceData: {
        traceId: '3',
        transactionId: '4',
      },
    },
  ],
});

/**
 * Developer script for creating conversations.
 * cd x-pack/plugins/elastic_assistant/scripts && node ./create_conversations --count=100
 */
export const AllowedActionTypeIds = ['.bedrock', '.gen-ai', '.gemini'];
const NODE = `http://elastic:changeme@127.0.0.1:9200`;
const KIBANA = `http://elastic:changeme@localhost:5601/kbn`;
const requestHeaders = {
  'kbn-xsrf': 'xxx',
  'Content-Type': 'application/json',
  // 'kbn-version': '1',
  // 'elastic-api-version': '1',
  // 'x-elastic-internal-product': 'Kibana',
};
export const create = async () => {
  const logger = new ToolingLog({
    level: 'info',
    writeTo: process.stdout,
  });
  const argv = yargs(process.argv.slice(2)).parse();
  const esUrl = argv.node ?? NODE;
  const kibanaUrl = removeTrailingSlash(argv.kibana ?? KIBANA);
  const count = argv.count ?? 100;
  logger.info(`Elasticsearch Node: ${esUrl}`);
  logger.info(`Kibana URL: ${kibanaUrl}`);
  const connectorsApiUrl = `${kibanaUrl}/api/actions/connectors`;
  const conversationsCreateUrl = `${kibanaUrl}${ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL}`;

  try {
    logger.info(`Fetching available connectors...`);
    const { data: connectors } = await axios.get(connectorsApiUrl, {
      headers: requestHeaders,
    });
    const aiConnectors = connectors.filter(
      ({ connector_type_id: connectorTypeId }: { connector_type_id: string }) =>
        AllowedActionTypeIds.includes(connectorTypeId)
    );
    if (aiConnectors.length === 0) {
      throw new Error('No AI connectors found, create an AI connector to use this script');
    }
    logger.info(`Creating ${count} conversations...`);

    const promises = [];

    for (let i = 0; i < count; i++) {
      promises.push(
        axios.post(
          conversationsCreateUrl,
          getCreateConversationSchemaMock({
            ...getMockConversationContent(),
            apiConfig: {
              actionTypeId: aiConnectors[0].connector_type_id,
              connectorId: aiConnectors[0].id,
            },
          }),
          { headers: requestHeaders }
        )
      );
    }
    const results = await Promise.all(promises);
    logger.info(`Successfully created ${results.length} conversations.`);
  } catch (e) {
    logger.error(e);
  }
};

function removeTrailingSlash(url: string) {
  if (url.endsWith('/')) {
    return url.slice(0, -1);
  } else {
    return url;
  }
}
