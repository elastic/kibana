/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient, ActionResult as ActionConnector } from '@kbn/actions-plugin/server';
import { isSupportedConnectorType, type InferenceConnector } from '../../common/connectors';
import { createInferenceRequestError } from '../../common/errors';

/**
 * Retrieves a connector given the provided `connectorId` and asserts it's an inference connector
 */
export const getConnectorById = async ({
  connectorId,
  actionsClient,
}: {
  actionsClient: ActionsClient;
  connectorId: string;
}): Promise<InferenceConnector> => {
  let connector: ActionConnector;
  try {
    connector = await actionsClient.get({
      id: connectorId,
      throwIfSystemAction: true,
    });
  } catch (error) {
    throw createInferenceRequestError(`No connector found for id '${connectorId}'`, 400);
  }

  const actionTypeId = connector.actionTypeId;

  if (!isSupportedConnectorType(actionTypeId)) {
    throw createInferenceRequestError(
      `Type '${actionTypeId}' not recognized as a supported connector type`,
      400
    );
  }

  return {
    connectorId: connector.id,
    name: connector.name,
    type: actionTypeId,
  };
};
