/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsResolveResponse } from 'kibana/server';
import { JoinOptions } from '../../../startup_migrations/types';
import { Alerting, SideCarAction } from './types';

export const join = ({
  logger,
  savedObject: actionSideCar,
  savedObjectsClient,
}: JoinOptions<SideCarAction>): Array<Promise<SavedObjectsResolveResponse<unknown>>> => {
  const { ruleAlertId, actions } = actionSideCar.attributes;
  logger.debug(
    `Getting legacy action side car promises which has a rulAlertId: ${ruleAlertId} and actions of length:, ${actions.length}`
  );
  const resolvedAlert = savedObjectsClient.resolve<Alerting>('alert', ruleAlertId);
  const resolvedActions = actions.map((action) => {
    logger.debug(`Getting join promises of action.id: ${action.id}`);
    return savedObjectsClient.resolve<unknown>('action', action.id);
  });
  const returnPromises = [resolvedAlert, ...resolvedActions];
  logger.debug(`Returning migration join promises of length: ${returnPromises.length}`);
  return [resolvedAlert, ...resolvedActions];
};
