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
import { RecursivePartial } from '@elastic/eui';
import { OpsgenieSubActions } from '../../../../common';
import type {
  OpsgenieActionConfig,
  OpsgenieActionParams,
  OpsgenieActionSecrets,
} from '../../../../server/connector_types/stack';
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
  OpsgenieActionParams
> => {
  return {
    id: '.opsgenie',
    iconClass: lazy(() => import('./logo')),
    selectMessage: SELECT_MESSAGE,
    actionTypeTitle: TITLE,
    validateParams: async (
      actionParams: RecursivePartial<OpsgenieActionParams>
    ): Promise<GenericValidationResult<unknown>> => {
      const translations = await import('./translations');
      const errors = {
        'subActionParams.message': new Array<string>(),
        'subActionParams.alias': new Array<string>(),
      };

      const validationResult = {
        errors,
      };

      if (
        actionParams.subAction === OpsgenieSubActions.CreateAlert &&
        !actionParams?.subActionParams?.message?.length
      ) {
        errors['subActionParams.message'].push(translations.MESSAGE_IS_REQUIRED);
      }

      if (
        actionParams.subAction === OpsgenieSubActions.CloseAlert &&
        !actionParams?.subActionParams?.alias?.length
      ) {
        errors['subActionParams.alias'].push(translations.ALIAS_IS_REQUIRED);
      }

      return validationResult;
    },
    actionConnectorFields: lazy(() => import('./connector')),
    actionParamsFields: lazy(() => import('./params')),
    defaultActionParams: {
      subAction: OpsgenieSubActions.CreateAlert,
      subActionParams: {
        alias: DEFAULT_ALIAS,
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
