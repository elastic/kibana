/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { Connector } from '@kbn/actions-plugin/server/application/connector/types';

export async function getAiConnector(
  connectorId: string,
  actionsClient: ActionsClient
): Promise<Connector> {
  const connector = await actionsClient.get({ id: connectorId });

  if (connector.actionTypeId !== '.gen-ai') {
    throw new Error('Specified connector is not a Gen AI connector.');
  }

  return connector;
}
