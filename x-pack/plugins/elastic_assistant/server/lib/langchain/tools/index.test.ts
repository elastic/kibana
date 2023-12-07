/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { KibanaRequest } from '@kbn/core-http-server';
import { RetrievalQAChain } from 'langchain/chains';

import { RequestBody } from '../types';
import { getApplicableTools } from '.';

describe('getApplicableTools', () => {
  const alertsIndexPattern = 'alerts-index';
  const esClient = {
    search: jest.fn().mockResolvedValue({}),
  } as unknown as ElasticsearchClient;
  const modelExists = true; // the ELSER model is installed
  const onNewReplacements = jest.fn();
  const replacements = { key: 'value' };
  const request = {
    body: {
      assistantLangChain: true,
      alertsIndexPattern: '.alerts-security.alerts-default',
      allow: ['@timestamp', 'cloud.availability_zone', 'user.name'],
      allowReplacement: ['user.name'],
      replacements,
      size: 20,
    },
  } as unknown as KibanaRequest<unknown, unknown, RequestBody>;
  const chain = {} as unknown as RetrievalQAChain;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return an array of applicable tools', () => {
    const tools = getApplicableTools({
      alertsIndexPattern,
      allow: request.body.allow,
      allowReplacement: request.body.allowReplacement,
      assistantLangChain: request.body.assistantLangChain,
      chain,
      esClient,
      modelExists,
      onNewReplacements,
      replacements,
      request,
      size: request.body.size,
    });

    const minExpectedTools = 3; // 3 tools are currently implemented

    expect(tools.length).toBeGreaterThanOrEqual(minExpectedTools);
  });
});
