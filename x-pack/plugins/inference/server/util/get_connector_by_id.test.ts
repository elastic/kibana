/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionResult as ActionConnector } from '@kbn/actions-plugin/server';
import { actionsClientMock } from '@kbn/actions-plugin/server/mocks';
import { InferenceConnectorType } from '../../common/connectors';
import { getConnectorById } from './get_connector_by_id';

describe('getConnectorById', () => {
  let actionsClient: ReturnType<typeof actionsClientMock.create>;
  const connectorId = 'my-connector-id';

  const createMockConnector = (parts: Partial<ActionConnector> = {}): ActionConnector => {
    return {
      id: 'mock',
      name: 'Mock',
      actionTypeId: 'action-type',
      ...parts,
    } as ActionConnector;
  };

  beforeEach(() => {
    actionsClient = actionsClientMock.create();
    actionsClient.get.mockResolvedValue(createMockConnector());
  });

  it('calls `actionsClient.get` with the right parameters', async () => {
    actionsClient.get.mockResolvedValue(
      createMockConnector({
        id: 'foo',
        name: 'Foo',
        actionTypeId: InferenceConnectorType.OpenAI,
      })
    );

    await getConnectorById({ actionsClient, connectorId });

    expect(actionsClient.get).toHaveBeenCalledTimes(1);
    expect(actionsClient.get).toHaveBeenCalledWith({
      id: connectorId,
      throwIfSystemAction: true,
    });
  });

  it('throws if `actionsClient.get` throws', async () => {
    actionsClient.get.mockImplementation(() => {
      throw new Error('Something wrong');
    });

    await expect(() =>
      getConnectorById({ actionsClient, connectorId })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"No connector found for id 'my-connector-id'"`);
  });

  it('throws the connector type is not compatible', async () => {
    actionsClient.get.mockResolvedValue(
      createMockConnector({
        id: 'tcp-pigeon-3-0',
        name: 'Tcp Pigeon',
        actionTypeId: '.tcp-pigeon',
      })
    );

    await expect(() =>
      getConnectorById({ actionsClient, connectorId })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Type '.tcp-pigeon' not recognized as a supported connector type"`
    );
  });

  it('returns the inference connector when successful', async () => {
    actionsClient.get.mockResolvedValue(
      createMockConnector({
        id: 'my-id',
        name: 'My Name',
        actionTypeId: InferenceConnectorType.OpenAI,
      })
    );

    const connector = await getConnectorById({ actionsClient, connectorId });

    expect(connector).toEqual({
      connectorId: 'my-id',
      name: 'My Name',
      type: InferenceConnectorType.OpenAI,
    });
  });
});
