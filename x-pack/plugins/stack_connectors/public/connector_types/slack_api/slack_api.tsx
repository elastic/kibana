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
} from './translations';
import type {
  SlackApiActionParams,
  SlackApiSecrets,
  PostMessageParams,
} from '../../../common/slack_api/types';
import { SLACK_API_CONNECTOR_ID } from '../../../common/slack_api/constants';
import { SlackActionParams } from '../types';
import { subtype } from '../slack/slack';

export const getConnectorType = (): ConnectorTypeModel<
  unknown,
  SlackApiSecrets,
  PostMessageParams
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
    if (actionParams.subAction === 'postMessage') {
      if (!actionParams.subActionParams.text) {
        errors.text.push(MESSAGE_REQUIRED);
      }
      if (!actionParams.subActionParams.channels?.length) {
        errors.channels.push(CHANNEL_REQUIRED);
      }
    }
    return validationResult;
  },
  actionConnectorFields: lazy(() => import('./slack_connectors')),
  actionParamsFields: lazy(() => import('./slack_params')),
  convertParamsBetweenGroups: (
    params: SlackActionParams | PostMessageParams
  ): SlackActionParams | PostMessageParams | {} => {
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
