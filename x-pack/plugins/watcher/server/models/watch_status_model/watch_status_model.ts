/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, map, forEach, maxBy } from 'lodash';
import { badRequest } from '@hapi/boom';
import { i18n } from '@kbn/i18n';

import { ACTION_STATES, WATCH_STATES, WATCH_STATE_COMMENTS } from '../../../common/constants';
import {
  WatchStatusUpstreamJson,
  ServerWatchStatusModel,
  DeserializedActionStatusModel,
} from '../../../common/types';
import { getMoment } from '../../../common/lib/get_moment';
// @ts-ignore // TODO
import { ActionStatusModel } from '../action_status_model';

// Replaces fromUpstreamJson factory method.
export const buildServerWatchStatusModel = (
  watchStatusUpstreamJson: WatchStatusUpstreamJson
): ServerWatchStatusModel => {
  const { id, watchStatusJson, state, watchErrors } = watchStatusUpstreamJson;

  if (!id) {
    throw badRequest(
      i18n.translate('xpack.watcher.models.watchStatus.idPropertyMissingBadRequestMessage', {
        defaultMessage: 'JSON argument must contain an id property',
      })
    );
  }

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
    return ActionStatusModel.fromUpstreamJson({
      id: actionStatusId,
      actionStatusJson,
      errors: watchErrors?.actions && watchErrors.actions[actionStatusId],
      lastCheckedRawFormat: get(watchStatusJson, 'last_checked'),
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

// Replaces downstreamJson getter method.
export const buildClientWatchStatusModel = (serverWatchStatusModel: ServerWatchStatusModel) => {
  const { id, isActive, lastChecked, lastMetCondition, actionStatuses } = serverWatchStatusModel;

  return {
    id,
    isActive,
    lastChecked,
    lastMetCondition,
    state: buildState(serverWatchStatusModel),
    comment: buildComment(serverWatchStatusModel),
    lastFired: buildLastFired(actionStatuses),
    actionStatuses: map(actionStatuses, (actionStatus) => actionStatus.downstreamJson),
  };
};

const getActionStatusTotals = (actionStatuses?: ServerWatchStatusModel['actionStatuses']) => {
  const result: { [key: string]: number } = {};

  forEach(ACTION_STATES, (state: keyof typeof ACTION_STATES) => {
    result[state] = 0;
  });

  if (actionStatuses) {
    actionStatuses.forEach((actionStatus: DeserializedActionStatusModel) => {
      result[actionStatus.state] = result[actionStatus.state] + 1;
    });
  }

  return result;
};

const buildState = (serverWatchStatusModel: ServerWatchStatusModel) => {
  const { isActive, watchState, actionStatuses } = serverWatchStatusModel;

  if (!isActive) {
    return WATCH_STATES.DISABLED;
  }

  if (watchState === 'failed') {
    return WATCH_STATES.ERROR;
  }

  const totals = getActionStatusTotals(actionStatuses);

  if (totals[ACTION_STATES.ERROR] > 0) {
    return WATCH_STATES.ERROR;
  }

  if (totals[ACTION_STATES.CONFIG_ERROR] > 0) {
    return WATCH_STATES.CONFIG_ERROR;
  }

  const firingTotal =
    totals[ACTION_STATES.FIRING] +
    totals[ACTION_STATES.ACKNOWLEDGED] +
    totals[ACTION_STATES.THROTTLED];

  if (firingTotal > 0) {
    return WATCH_STATES.FIRING;
  }

  return WATCH_STATES.OK;
};

const buildComment = (serverWatchStatusModel: ServerWatchStatusModel) => {
  const { isActive, actionStatuses } = serverWatchStatusModel;

  const totals = getActionStatusTotals(actionStatuses);
  const totalActions = actionStatuses ? actionStatuses.length : 0;
  let result = WATCH_STATE_COMMENTS.OK;

  if (totals[ACTION_STATES.THROTTLED] > 0 && totals[ACTION_STATES.THROTTLED] < totalActions) {
    result = WATCH_STATE_COMMENTS.PARTIALLY_THROTTLED;
  }

  if (totals[ACTION_STATES.THROTTLED] > 0 && totals[ACTION_STATES.THROTTLED] === totalActions) {
    result = WATCH_STATE_COMMENTS.THROTTLED;
  }

  if (totals[ACTION_STATES.ACKNOWLEDGED] > 0 && totals[ACTION_STATES.ACKNOWLEDGED] < totalActions) {
    result = WATCH_STATE_COMMENTS.PARTIALLY_ACKNOWLEDGED;
  }

  if (
    totals[ACTION_STATES.ACKNOWLEDGED] > 0 &&
    totals[ACTION_STATES.ACKNOWLEDGED] === totalActions
  ) {
    result = WATCH_STATE_COMMENTS.ACKNOWLEDGED;
  }

  if (totals[ACTION_STATES.ERROR] > 0) {
    result = WATCH_STATE_COMMENTS.FAILING;
  }

  if (!isActive) {
    result = WATCH_STATE_COMMENTS.OK;
  }

  return result;
};

const buildLastFired = (actionStatuses: ServerWatchStatusModel['actionStatuses']) => {
  const actionStatus = maxBy(actionStatuses, 'lastExecution');
  if (actionStatus) {
    return actionStatus.lastExecution;
  }
};
