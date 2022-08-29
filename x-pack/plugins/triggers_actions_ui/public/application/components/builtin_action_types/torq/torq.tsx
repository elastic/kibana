/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { ActionTypeModel, GenericValidationResult } from '../../../../types';
import { TorqActionParams, TorqConfig, TorqSecrets } from '../types';
import * as i18n from './translations';

function replaceReferencesWithNumbers(body: string) {
  return body.replace(/\{\{[.\w]+\}\}/gm, "42");
}

export function getActionType(): ActionTypeModel<TorqConfig, TorqSecrets, TorqActionParams> {
  const validateParams = async (
    actionParams: TorqActionParams
  ): Promise<GenericValidationResult<TorqActionParams>> => {
    const translations = await import('./translations');
    const errors = {
      body: [] as string[],
    };
    const validationResult = { errors };
    validationResult.errors = errors;
    if (!actionParams.body?.length) {
      errors.body.push(translations.BODY_REQUIRED);
    }
    try {
      JSON.parse(replaceReferencesWithNumbers(actionParams.body || ""));
    } catch (e) {
      errors.body.push(translations.INVALID_JSON);
    }
    return validationResult;
  };
  return {
    id: '.torq',
    iconClass: lazy(() => import('./logo')),
    selectMessage: i18n.TORQ_SELECT_MESSAGE,
    actionTypeTitle: i18n.TORQ_ACTION_TYPE_TITLE,
    validateParams,
    actionConnectorFields: lazy(() => import('./torq_connectors')),
    actionParamsFields: lazy(() => import('./torq_params')),
  };
}
