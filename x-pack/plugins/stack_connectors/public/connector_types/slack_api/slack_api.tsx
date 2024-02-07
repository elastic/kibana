/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import type {
  ActionTypeModel as ConnectorTypeModel,
  GenericValidationResult,
} from '@kbn/triggers-actions-ui-plugin/public/types';
import {
  ACTION_TYPE_TITLE,
  CHANNEL_REQUIRED,
  MESSAGE_REQUIRED,
  SELECT_MESSAGE,
  JSON_REQUIRED,
  BLOCKS_REQUIRED,
} from './translations';
import type {
  SlackApiActionParams,
  SlackApiSecrets,
  PostMessageParams,
  SlackApiConfig,
  PostBlockkitParams,
} from '../../../common/slack_api/types';
import { SLACK_API_CONNECTOR_ID } from '../../../common/slack_api/constants';
import { SlackActionParams } from '../types';
import { subtype } from '../slack/slack';

const isChannelValid = (channels?: string[], channelIds?: string[]) => {
  if (
    (channels === undefined && !channelIds?.length) ||
    (channelIds === undefined && !channels?.length) ||
    (!channelIds?.length && !channels?.length)
  ) {
    return false;
  }
  return true;
};

export const getConnectorType = (): ConnectorTypeModel<
  SlackApiConfig,
  SlackApiSecrets,
  PostMessageParams | PostBlockkitParams
> => ({
  id: SLACK_API_CONNECTOR_ID,
  subtype,
  hideInUi: true,
  modalWidth: 675,
  iconClass: 'logoSlack',
  selectMessage: SELECT_MESSAGE,
  actionTypeTitle: ACTION_TYPE_TITLE,
  validateParams: async (
    actionParams: SlackApiActionParams
  ): Promise<GenericValidationResult<unknown>> => {
    const errors = {
      text: new Array<string>(),
      channels: new Array<string>(),
    };
    const validationResult = { errors };
    if (actionParams.subAction === 'postMessage' || actionParams.subAction === 'postBlockkit') {
      if (!actionParams.subActionParams.text) {
        errors.text.push(MESSAGE_REQUIRED);
      }
      if (
        !isChannelValid(
          actionParams.subActionParams.channels,
          actionParams.subActionParams.channelIds
        )
      ) {
        errors.channels.push(CHANNEL_REQUIRED);
      }

      if (actionParams.subAction === 'postBlockkit' && actionParams.subActionParams.text) {
        try {
          const blockkitJson = JSON.parse(actionParams.subActionParams.text);
          if (!blockkitJson.hasOwnProperty('blocks')) {
            errors.text.push(BLOCKS_REQUIRED);
          }
        } catch {
          errors.text.push(JSON_REQUIRED);
        }
      }
    }
    return validationResult;
  },
  actionConnectorFields: lazy(() => import('./slack_connectors')),
  actionParamsFields: lazy(() => import('./slack_params')),
  convertParamsBetweenGroups: (
    params: SlackActionParams | PostMessageParams | PostBlockkitParams
  ): SlackActionParams | PostMessageParams | PostBlockkitParams | {} => {
    if ('message' in params) {
      return {
        subAction: 'postMessage',
        subActionParams: {
          channels: [],
          text: params.message,
        },
      };
    } else if ('subAction' in params) {
      return params;
    }
    return {};
  },
});
