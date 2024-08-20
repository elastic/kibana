/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { Connector } from '@kbn/actions-plugin/server/application/connector/types';
import { Logger } from '@kbn/core/server';
import { ActionsClientLlm } from '@kbn/langchain/server';
import { PublicMethodsOf } from '@kbn/utility-types';

import { getLlmType } from '../../../../../routes/utils';

export const getEvaluatorLlm = async ({
  actionsClient,
  connectors,
  connectorTimeout,
  evaluatorConnectorId,
  experimentConnector,
  logger,
}: {
  actionsClient: PublicMethodsOf<ActionsClient>;
  connectors: Connector[];
  connectorTimeout: number;
  evaluatorConnectorId: string | undefined;
  experimentConnector: Connector;
  logger: Logger;
}): Promise<ActionsClientLlm> => {
  const evaluatorConnector =
    (await actionsClient.get({
      id: evaluatorConnectorId ?? experimentConnector.id, // fallback to the experiment connector if the evaluator connector is not found:
      throwIfSystemAction: false,
    })) ?? experimentConnector;

  const evaluatorLlmType = getLlmType(evaluatorConnector.actionTypeId);
  const experimentLlmType = getLlmType(experimentConnector.actionTypeId);

  logger.info(
    `The ${evaluatorConnector.name} (${evaluatorLlmType}) connector will judge output from the ${experimentConnector.name} (${experimentLlmType}) connector`
  );

  return new ActionsClientLlm({
    actionsClient,
    connectorId: evaluatorConnector.id,
    llmType: evaluatorLlmType,
    logger,
    temperature: 0, // zero temperature for evaluation
    timeout: connectorTimeout,
  });
};
