/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockEndpointAppContextService } from '../../mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { CompleteExternalActionsTaskRunner } from './complete_external_actions_task_runner';
import { RESPONSE_ACTION_AGENT_TYPE } from '../../../../common/endpoint/service/response_actions/constants';
import { responseActionsClientMock } from '../../services/actions/clients/mocks';
import { EndpointActionGenerator } from '../../../../common/endpoint/data_generators/endpoint_action_generator';
import { ENDPOINT_ACTION_RESPONSES_INDEX } from '../../../../common/endpoint/constants';
import { waitFor } from '@testing-library/react';
import { ResponseActionsConnectorNotConfiguredError } from '../../services/actions/clients/errors';

describe('CompleteExternalTaskRunner class', () => {
  let endpointContextServicesMock: ReturnType<typeof createMockEndpointAppContextService>;
  let esClientMock: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let runnerInstance: CompleteExternalActionsTaskRunner;

  beforeEach(() => {
    endpointContextServicesMock = createMockEndpointAppContextService();
    esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    runnerInstance = new CompleteExternalActionsTaskRunner(
      endpointContextServicesMock,
      esClientMock
    );
    const actionGenerator = new EndpointActionGenerator('seed');

    (endpointContextServicesMock.getInternalResponseActionsClient as jest.Mock).mockImplementation(
      () => {
        const clientMock = responseActionsClientMock.create();
        (clientMock.processPendingActions as jest.Mock).mockImplementation(
          async ({ addToQueue }) => {
            addToQueue(actionGenerator.generateResponse());
          }
        );
        return clientMock;
      }
    );
  });

  it('should do nothing if license is not enterprise', async () => {
    (endpointContextServicesMock.getLicenseService().isEnterprise as jest.Mock).mockReturnValueOnce(
      false
    );
    await runnerInstance.run();

    expect(endpointContextServicesMock.createLogger().debug).toHaveBeenCalledWith(
      `Exiting: Run aborted due to license not being Enterprise`
    );
  });

  it('should NOT log an error if agentType is not configured with a connector', async () => {
    (endpointContextServicesMock.getInternalResponseActionsClient as jest.Mock).mockImplementation(
      () => {
        const clientMock = responseActionsClientMock.create();
        (clientMock.processPendingActions as jest.Mock).mockImplementation(async () => {
          throw new ResponseActionsConnectorNotConfiguredError('foo');
        });
        return clientMock;
      }
    );
    await runnerInstance.run();

    expect(endpointContextServicesMock.createLogger().error).not.toHaveBeenCalled();
  });

  it('should call `processPendingAction` for each external agent type', async () => {
    await runnerInstance.run();
    const getInternalResponseActionsClientMock = (
      endpointContextServicesMock.getInternalResponseActionsClient as jest.Mock
    ).mock;

    RESPONSE_ACTION_AGENT_TYPE.filter((agentType) => agentType !== 'endpoint').forEach(
      (agentType, index) => {
        expect(getInternalResponseActionsClientMock.calls[index][0].agentType).toEqual(agentType);
        expect(
          getInternalResponseActionsClientMock.results[index].value.processPendingActions
        ).toHaveBeenCalledWith({
          abortSignal: expect.any(AbortSignal),
          addToQueue: expect.any(Function),
        });
      }
    );
  });

  it('should call ES to create action response documents', async () => {
    await runnerInstance.run();

    expect(esClientMock.bulk).toHaveBeenCalledWith({
      index: ENDPOINT_ACTION_RESPONSES_INDEX,
      operations: [
        { create: { _index: ENDPOINT_ACTION_RESPONSES_INDEX } },
        expect.objectContaining({
          '@timestamp': expect.any(String),
          EndpointActions: expect.any(Object),
          agent: expect.any(Object),
        }),
        { create: { _index: ENDPOINT_ACTION_RESPONSES_INDEX } },
        expect.objectContaining({
          '@timestamp': expect.any(String),
          EndpointActions: expect.any(Object),
          agent: expect.any(Object),
        }),
      ],
    });
  });

  it('should return next `runAt` when complete', async () => {
    const result = await runnerInstance.run();
    const now = Date.now();
    const nextRunAt = result!.runAt!.getTime();

    expect(nextRunAt).toBeGreaterThan(now);
    expect(nextRunAt).toBeLessThanOrEqual(now + 60000 /* 60s is the default */);
  });

  it('should abort run if `cancel()` is called', async () => {
    let resolveProcessPendingActionsPromise: (result: unknown) => void;
    let processPendingActionsAbortSignal: AbortSignal;

    (endpointContextServicesMock.getInternalResponseActionsClient as jest.Mock).mockImplementation(
      () => {
        const clientMock = responseActionsClientMock.create();
        (clientMock.processPendingActions as jest.Mock).mockImplementation(
          async ({ abortSignal }) => {
            return new Promise((resolve) => {
              if (!resolveProcessPendingActionsPromise) {
                resolveProcessPendingActionsPromise = resolve;
                processPendingActionsAbortSignal = abortSignal;
              } else {
                resolve(null);
              }
            });
          }
        );
        return clientMock;
      }
    );
    runnerInstance.run();

    await waitFor(() => {
      expect(endpointContextServicesMock.getInternalResponseActionsClient).toHaveBeenCalled();
    });

    runnerInstance.cancel();

    expect(processPendingActionsAbortSignal!.aborted).toBe(true);
  });
});
