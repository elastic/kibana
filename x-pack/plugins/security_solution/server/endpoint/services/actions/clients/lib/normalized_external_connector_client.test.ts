/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClientMock } from '@kbn/actions-plugin/server/actions_client/actions_client.mock';
import { responseActionsClientMock } from '../mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { Logger } from '@kbn/logging';
import type { NormalizedExternalConnectorClientExecuteOptions } from './normalized_external_connector_client';
import { NormalizedExternalConnectorClient } from './normalized_external_connector_client';
import { ResponseActionsConnectorNotConfiguredError } from '../errors';
import type { IUnsecuredActionsClient } from '@kbn/actions-plugin/server';
import { unsecuredActionsClientMock } from '@kbn/actions-plugin/server/unsecured_actions_client/unsecured_actions_client.mock';

describe('`NormalizedExternalConnectorClient` class', () => {
  let logger: Logger;
  let executeInputOptions: NormalizedExternalConnectorClientExecuteOptions;

  beforeEach(() => {
    logger = loggingSystemMock.create().get('mock');
    executeInputOptions = { params: { subAction: 'sub-action-1', subActionParams: {} } };
  });

  it.each([
    ['getAll', ['space-1']],
    ['execute', [{ spaceId: 'space-1', params: {} }]],
  ])('should error if %s() is called prior calling .setup()', async (methodName, methodArgs) => {
    const testInstance = new NormalizedExternalConnectorClient(
      unsecuredActionsClientMock.create(),
      logger
    );

    await expect(
      // @ts-ignore ignoring args and method name since we are only trying to validate that it errors out
      testInstance[methodName](...methodArgs)
    ).rejects.toHaveProperty('message', 'Instance has not been .setup()!');
  });

  describe('#getConnectorInstance()', () => {
    let actionPluginConnectorClient: ActionsClientMock;

    beforeEach(() => {
      actionPluginConnectorClient = responseActionsClientMock.createConnectorActionsClient({
        getAllResponse: [responseActionsClientMock.createConnector({ actionTypeId: 'foo' })],
      });
    });

    it('should search for the connector when first API call is done', async () => {
      const testInstance = new NormalizedExternalConnectorClient(
        actionPluginConnectorClient,
        logger
      );
      testInstance.setup('foo');

      expect(actionPluginConnectorClient.getAll).not.toHaveBeenCalled();

      await testInstance.execute({ params: { subAction: 'sub-action-1', subActionParams: {} } });

      expect(actionPluginConnectorClient.getAll).toHaveBeenCalledTimes(1);

      // Subsequent calls to `.execute()` should not trigger logic to find Connector instance again
      await testInstance.execute(executeInputOptions);

      expect(actionPluginConnectorClient.getAll).toHaveBeenCalledTimes(1);
    });

    it('should error if unable to retrieve all connector instances (`.getAll()`) ', async () => {
      (actionPluginConnectorClient.getAll as jest.Mock).mockImplementation(async () => {
        throw new Error('oh oh');
      });
      const testInstance = new NormalizedExternalConnectorClient(
        actionPluginConnectorClient,
        logger
      );
      testInstance.setup('foo');
      const executePromise = testInstance.execute(executeInputOptions);

      await expect(executePromise).rejects.toHaveProperty(
        'message',
        'Unable to retrieve list of stack connectors in order to find one for [foo]: oh oh'
      );
      await expect(executePromise).rejects.toHaveProperty('statusCode', 400);
    });

    it.each([
      ['is not defined', () => []],
      [
        'is deprecated',
        () => [
          responseActionsClientMock.createConnector({ actionTypeId: 'foo', isDeprecated: true }),
        ],
      ],
      [
        'is missing secrets',
        () => [
          responseActionsClientMock.createConnector({
            actionTypeId: 'foo',
            isMissingSecrets: true,
          }),
        ],
      ],
    ])('should error if a connector instance %s', async (_, getResponse) => {
      (actionPluginConnectorClient.getAll as jest.Mock).mockResolvedValue(getResponse());
      const testInstance = new NormalizedExternalConnectorClient(
        actionPluginConnectorClient,
        logger
      );
      testInstance.setup('foo');
      const executePromise = testInstance.execute(executeInputOptions);

      await expect(executePromise).rejects.toEqual(
        new ResponseActionsConnectorNotConfiguredError('foo')
      );
    });
  });

  describe('with ActionClient', () => {
    let actionPluginConnectorClient: ActionsClientMock;

    beforeEach(() => {
      actionPluginConnectorClient = responseActionsClientMock.createConnectorActionsClient({
        getAllResponse: [responseActionsClientMock.createConnector({ actionTypeId: 'foo' })],
      });
    });

    it('should call Action Plugin client `.execute()` with expected arguments', async () => {
      const testInstance = new NormalizedExternalConnectorClient(
        actionPluginConnectorClient,
        logger
      );
      testInstance.setup('foo');
      await testInstance.execute(executeInputOptions);

      expect(actionPluginConnectorClient.execute).toHaveBeenCalledWith({
        actionId: 'connector-mock-id-1',
        params: executeInputOptions.params,
      });
    });
  });

  describe('with IUnsecuredActionsClient', () => {
    let actionPluginConnectorClient: IUnsecuredActionsClient;

    beforeEach(() => {
      actionPluginConnectorClient = unsecuredActionsClientMock.create();

      (actionPluginConnectorClient.getAll as jest.Mock).mockResolvedValue([
        responseActionsClientMock.createConnector({ actionTypeId: 'foo' }),
      ]);
    });

    it('should call Action Plugin client `.execute()` with expected arguments', async () => {
      const testInstance = new NormalizedExternalConnectorClient(
        actionPluginConnectorClient,
        logger,
        {
          relatedSavedObjects: [
            {
              id: 'so-id-1',
              type: 'so-type-1',
            },
          ],
        }
      );
      testInstance.setup('foo');
      await testInstance.execute(executeInputOptions);

      expect(actionPluginConnectorClient.execute).toHaveBeenCalledWith({
        id: 'connector-mock-id-1',
        requesterId: 'background_task',
        spaceId: 'default',
        params: executeInputOptions.params,
        relatedSavedObjects: [
          {
            id: 'so-id-1',
            type: 'so-type-1',
          },
        ],
      });
    });
  });
});
