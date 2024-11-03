/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionsClientMock } from '@kbn/actions-plugin/server/mocks';
import { InferenceConnector, InferenceConnectorType } from '../../../common/connectors';
import { createInferenceExecutor, type InferenceExecutor } from './inference_executor';

describe('createInferenceExecutor', () => {
  let actionsClient: ReturnType<typeof actionsClientMock.create>;
  let executor: InferenceExecutor;

  const connector: InferenceConnector = {
    connectorId: 'foo',
    name: 'My Connector',
    type: InferenceConnectorType.OpenAI,
  };

  beforeEach(() => {
    actionsClient = actionsClientMock.create();
    executor = createInferenceExecutor({ actionsClient, connector });
  });

  describe('#invoke()', () => {
    it('calls `actionsClient.execute` with the right parameters', async () => {
      await executor.invoke({ subAction: 'stream', subActionParams: { over: 9000 } });

      expect(actionsClient.execute).toHaveBeenCalledTimes(1);
      expect(actionsClient.execute).toHaveBeenCalledWith({
        actionId: connector.connectorId,
        params: { subAction: 'stream', subActionParams: { over: 9000 } },
      });
    });

    it('returns the value returned from `actionsClient.execute`', async () => {
      const expectedResult = Symbol.for('call_result');

      actionsClient.execute.mockResolvedValue(expectedResult as any);

      const result = await executor.invoke({
        subAction: 'stream',
        subActionParams: { over: 9000 },
      });

      expect(result).toBe(expectedResult);
    });
  });
});
