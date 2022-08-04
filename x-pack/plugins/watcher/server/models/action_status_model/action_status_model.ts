/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest } from '@hapi/boom';
import { i18n } from '@kbn/i18n';

import { ACTION_STATES } from '../../../common/constants';
import { ActionStatusUpstreamJson, ServerActionStatusModel } from '../../../common/types';
import { getMoment } from '../../../common/lib/get_moment';

// Replaces fromUpstreamJson factory method.
export const buildServerActionStatusModel = (
  actionStatusUpstreamJson: ActionStatusUpstreamJson
): ServerActionStatusModel => {
  const { id, actionStatusJson, errors, lastCheckedRawFormat } = actionStatusUpstreamJson;

  const missingPropertyError = (missingProperty: string) =>
    i18n.translate(
      'xpack.watcher.models.actionStatus.actionStatusJsonPropertyMissingBadRequestMessage',
      {
        defaultMessage: 'JSON argument must contain an "{missingProperty}" property',
        values: { missingProperty },
      }
    );

  // TODO: Remove once all consumers and upstream dependencies are converted to TS.
  if (!id) {
    throw badRequest(missingPropertyError('id'));
  }

  // TODO: Remove once all consumers and upstream dependencies are converted to TS.
  if (!actionStatusJson) {
    throw badRequest(missingPropertyError('actionStatusJson'));
  }

  return {
    id,
    actionStatusJson,
    errors,
    lastCheckedRawFormat,
    lastExecutionRawFormat: actionStatusJson.last_execution?.timestamp,
    lastAcknowledged: getMoment(actionStatusJson.ack.timestamp),
    lastExecution: getMoment(actionStatusJson.last_execution?.timestamp),
    lastExecutionSuccessful: actionStatusJson.last_execution?.successful,
    lastExecutionReason: actionStatusJson.last_execution?.reason,
    lastThrottled: getMoment(actionStatusJson.last_throttle?.timestamp),
    lastSuccessfulExecution: getMoment(actionStatusJson.last_successful_execution?.timestamp),
  };
};

// Replaces downstreamJson getter method.
export const buildClientActionStatusModel = (serverActionStatusModel: ServerActionStatusModel) => {
  const {
    id,
    lastAcknowledged,
    lastThrottled,
    lastExecution,
    lastExecutionSuccessful,
    lastExecutionReason,
    lastSuccessfulExecution,
  } = serverActionStatusModel;
  const state = deriveState(serverActionStatusModel);
  const isAckable = deriveIsAckable(state);

  return {
    id,
    lastAcknowledged,
    lastThrottled,
    lastExecution,
    lastExecutionSuccessful,
    lastExecutionReason,
    lastSuccessfulExecution,
    state,
    isAckable,
  };
};

const deriveState = (serverActionStatusModel: ServerActionStatusModel) => {
  const {
    actionStatusJson,
    lastExecutionSuccessful,
    lastCheckedRawFormat,
    lastExecutionRawFormat,
    errors,
    lastAcknowledged,
    lastExecution,
    lastThrottled,
    lastSuccessfulExecution,
  } = serverActionStatusModel;
  const ackState = actionStatusJson.ack.state;

  if (lastExecutionSuccessful === false && lastCheckedRawFormat === lastExecutionRawFormat) {
    return ACTION_STATES.ERROR;
  }

  if (errors) {
    return ACTION_STATES.CONFIG_ERROR;
  }

  if (ackState === 'awaits_successful_execution') {
    return ACTION_STATES.OK;
  }

  if (lastExecution) {
    // Might be null
    if (lastAcknowledged) {
      // Might be null
      if (ackState === 'acked' && lastAcknowledged >= lastExecution) {
        return ACTION_STATES.ACKNOWLEDGED;
      }

      // A user could potentially land in this state if running on multiple nodes and timing is off
      if (ackState === 'acked' && lastAcknowledged < lastExecution) {
        return ACTION_STATES.ERROR;
      }
    }

    if (lastThrottled) {
      // Might be null
      if (ackState === 'ackable' && lastThrottled >= lastExecution) {
        return ACTION_STATES.THROTTLED;
      }
    }

    if (lastSuccessfulExecution) {
      // Might be null
      if (ackState === 'ackable' && lastSuccessfulExecution >= lastExecution) {
        return ACTION_STATES.FIRING;
      }

      if (ackState === 'ackable' && lastSuccessfulExecution < lastExecution) {
        return ACTION_STATES.ERROR;
      }
    }
  }

  // At this point, we cannot determine the action status so mark it as "unknown".
  // We should never get to this point in the code. If we do, it means we are
  // missing an action status and the logic to determine it.
  return ACTION_STATES.UNKNOWN;
};

const deriveIsAckable = (state: keyof typeof ACTION_STATES) => {
  if (state === ACTION_STATES.THROTTLED || state === ACTION_STATES.FIRING) {
    return true;
  }

  return false;
};
