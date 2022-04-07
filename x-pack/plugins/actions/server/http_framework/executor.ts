/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'kibana/server';
import { ActionsConfigurationUtilities } from '../actions_config';
import { CaseConnectorInterface } from '../connectors/case';
import { ActionTypeConfig, ActionTypeParams, ActionTypeSecrets, ExecutorType } from '../types';
import { HTTPConnectorType } from './types';

export const buildExecutor = <Config, Secrets>({
  configurationUtilities,
  connector,
  logger,
}: {
  connector: HTTPConnectorType<Config, Secrets>;
  logger: Logger;
  configurationUtilities: ActionsConfigurationUtilities;
}): ExecutorType<ActionTypeConfig, ActionTypeSecrets, ActionTypeParams, unknown> => {
  return async ({ actionId, params, config, secrets }) => {
    const subAction = params.subAction;
    const subActionParams = params.subActionParams;

    const service = new connector.Service({
      config,
      configurationUtilities,
      logger,
      params,
      secrets,
    });

    const method = connector.subActions.find(({ name }) => name === subAction)?.method as
      | keyof CaseConnectorInterface
      | 'pushToService'
      | undefined;

    if (!method) {
      throw new Error('Method not registered');
    }

    if (method === 'pushToService') {
      const { externalId, comments, ...rest } = subActionParams as {
        externalId: string;
        comments: Array<{ comment: string; commentId: string }>;
        [x: string]: unknown;
      };

      let res: Record<string, { comments: Array<{ commentId: string }> }>;

      if (externalId != null) {
        res = await service.updateIncident({
          incidentId: externalId,
          incident: rest,
        });
      } else {
        res = await await service.createIncident({
          ...rest,
        });
      }

      if (comments && Array.isArray(comments) && comments.length > 0) {
        res.comments = [];

        for (const currentComment of comments) {
          await service.addComment({
            incidentId: res.id,
            comment: currentComment.comment,
          });

          res.comments = [
            ...(res.comments ?? []),
            {
              commentId: currentComment.commentId,
              pushedDate: res.pushedDate,
            },
          ];
        }
      }
    }

    const data = await service[method](subActionParams);
    return { status: 'ok', data, actionId };
  };
};
