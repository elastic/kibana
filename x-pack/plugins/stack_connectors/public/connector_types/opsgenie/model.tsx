/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import {
  ActionTypeModel as ConnectorTypeModel,
  GenericValidationResult,
} from '@kbn/triggers-actions-ui-plugin/public';
import { isEmpty } from 'lodash';
import { OpsgenieSubActions } from '../../../common';
import { RULE_TAGS_TEMPLATE } from '../../../common/opsgenie';
import type { OpsgenieActionConfig, OpsgenieActionSecrets } from '../../../server/connector_types';
import { OpsgenieConnectorTypeParams, ValidationParams } from './types';
import { DEFAULT_ALIAS } from './constants';

const SELECT_MESSAGE = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.selectMessageText',
  {
    defaultMessage: 'Create or close an alert in Opsgenie.',
  }
);

const TITLE = i18n.translate('xpack.stackConnectors.components.opsgenie.connectorTypeTitle', {
  defaultMessage: 'Opsgenie',
});

export const getConnectorType = (): ConnectorTypeModel<
  OpsgenieActionConfig,
  OpsgenieActionSecrets,
  OpsgenieConnectorTypeParams
> => {
  return {
    id: '.opsgenie',
    iconClass: lazy(() => import('./logo')),
    selectMessage: SELECT_MESSAGE,
    actionTypeTitle: TITLE,
    validateParams,
    actionConnectorFields: lazy(() => import('./connector')),
    actionParamsFields: lazy(() => import('./params')),
    defaultActionParams: {
      subAction: OpsgenieSubActions.CreateAlert,
      subActionParams: {
        alias: DEFAULT_ALIAS,
        tags: [RULE_TAGS_TEMPLATE],
      },
    },
    defaultRecoveredActionParams: {
      subAction: OpsgenieSubActions.CloseAlert,
      subActionParams: {
        alias: DEFAULT_ALIAS,
      },
    },
  };
};

const validateParams = async (
  actionParams: ValidationParams
): Promise<GenericValidationResult<unknown>> => {
  const translations = await import('./translations');
  const errors = {
    'subActionParams.message': new Array<string>(),
    'subActionParams.alias': new Array<string>(),
    jsonEditorError: new Array<string>(),
  };

  const validationResult = {
    errors,
  };

  if (actionParams.subAction === OpsgenieSubActions.CreateAlert) {
    if (!actionParams?.subActionParams?.message?.length) {
      errors['subActionParams.message'].push(translations.MESSAGE_IS_REQUIRED);
    } else if (isEmpty(actionParams?.subActionParams?.message?.trim())) {
      errors['subActionParams.message'].push(translations.MESSAGE_NON_WHITESPACE);
    }
  }
  if (
    actionParams.subAction === OpsgenieSubActions.CloseAlert &&
    !actionParams?.subActionParams?.alias?.length
  ) {
    errors['subActionParams.alias'].push(translations.ALIAS_IS_REQUIRED);
  }

  if (actionParams.jsonEditorError) {
    // This error doesn't actually get displayed it is used to cause the run/save button to fail within the action form
    errors.jsonEditorError.push(translations.JSON_EDITOR_ERROR);
  }

  return validationResult;
};
