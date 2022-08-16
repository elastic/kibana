/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest } from '@hapi/boom';
import { i18n } from '@kbn/i18n';

import {
  WatchStatusModelEs,
  ServerWatchStatusModel,
  ClientWatchStatusModel,
} from '../../../common/types';
import { getMoment } from '../../../common/lib/get_moment';
import { buildServerActionStatusModel, buildClientActionStatusModel } from '../action_status_model';
import { deriveState, deriveComment, deriveLastExecution } from './watch_status_model_utils';

export const buildServerWatchStatusModel = (
  watchStatusModelEs: WatchStatusModelEs
): ServerWatchStatusModel => {
  const { id, watchStatusJson, state, watchErrors } = watchStatusModelEs;

  // TODO: Remove once all consumers and upstream dependencies are converted to TS.
  if (!id) {
    throw badRequest(
      i18n.translate('xpack.watcher.models.watchStatus.idPropertyMissingBadRequestMessage', {
        defaultMessage: 'JSON argument must contain an id property',
      })
    );
  }

  // TODO: Remove once all consumers and upstream dependencies are converted to TS.
  if (!watchStatusJson) {
    throw badRequest(
      i18n.translate(
        'xpack.watcher.models.watchStatus.watchStatusJsonPropertyMissingBadRequestMessage',
        {
          defaultMessage: 'JSON argument must contain a watchStatusJson property',
        }
      )
    );
  }

  const actionStatuses = Object.keys(watchStatusJson.actions ?? {}).map((actionStatusId) => {
    const actionStatusJson = watchStatusJson.actions![actionStatusId];
    return buildServerActionStatusModel({
      id: actionStatusId,
      actionStatusJson,
      errors: watchErrors?.actions && watchErrors.actions[actionStatusId],
      lastCheckedRawFormat: watchStatusJson.last_checked,
    });
  });

  return {
    id,
    watchState: state,
    watchStatusJson,
    watchErrors: watchErrors ?? {},
    isActive: Boolean(watchStatusJson.state.active),
    lastChecked: getMoment(watchStatusJson.last_checked),
    lastMetCondition: getMoment(watchStatusJson.last_met_condition),
    actionStatuses,
  };
};

export const buildClientWatchStatusModel = (
  serverWatchStatusModel: ServerWatchStatusModel
): ClientWatchStatusModel => {
  const { id, isActive, watchState, lastChecked, lastMetCondition, actionStatuses } =
    serverWatchStatusModel;
  const clientActionStatuses =
    actionStatuses?.map((actionStatus) => buildClientActionStatusModel(actionStatus)) ?? [];

  return {
    id,
    isActive,
    lastChecked,
    lastMetCondition,
    state: deriveState(isActive, watchState, clientActionStatuses),
    comment: deriveComment(isActive, clientActionStatuses),
    lastExecution: deriveLastExecution(clientActionStatuses),
    actionStatuses: clientActionStatuses,
  };
};
