/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { postEvaluateRoute } from './post_evaluate';
import { serverMock } from '../../__mocks__/server';
import { requestContextMock } from '../../__mocks__/request_context';
import { getPostEvaluateRequest } from '../../__mocks__/request';
import type {
  PostEvaluateRequestBodyInput,
  PostEvaluateRequestQueryInput,
} from '@kbn/elastic-assistant-common';

const defaultBody: PostEvaluateRequestBodyInput = {
  dataset: undefined,
  evalPrompt: undefined,
};

const defaultQueryParams: PostEvaluateRequestQueryInput = {
  agents: 'agents',
  datasetName: undefined,
  evaluationType: undefined,
  evalModel: undefined,
  models: 'models',
  outputIndex: '.kibana-elastic-ai-assistant-',
  projectName: undefined,
  runName: undefined,
};

describe('Post Evaluate Route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { context } = requestContextMock.createTools();
  const mockGetElser = jest.fn().mockResolvedValue('.elser_model_2');

  beforeEach(() => {
    server = serverMock.create();
    ({ context } = requestContextMock.createTools());

    postEvaluateRoute(server.router, mockGetElser);
  });

  describe('Capabilities', () => {
    it('returns a 404 if evaluate feature is not registered', async () => {
      context.elasticAssistant.getRegisteredFeatures.mockReturnValueOnce({
        assistantModelEvaluation: false,
      });

      const response = await server.inject(
        getPostEvaluateRequest({ body: defaultBody, query: defaultQueryParams }),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(404);
    });
  });
});
