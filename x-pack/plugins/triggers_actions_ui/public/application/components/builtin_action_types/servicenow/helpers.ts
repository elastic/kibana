/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSelectOption } from '@elastic/eui';
import {
  ENABLE_NEW_SN_ITSM_CONNECTOR,
  ENABLE_NEW_SN_SIR_CONNECTOR,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../../../actions/server/constants/connectors';
import { IErrorObject } from '../../../../../public/types';
import { AppInfo, Choice, RESTApiError, ServiceNowActionConnector } from './types';

export const DEFAULT_CORRELATION_ID = '{{rule.id}}:{{alert.id}}';

export const choicesToEuiOptions = (choices: Choice[]): EuiSelectOption[] =>
  choices.map((choice) => ({ value: choice.value, text: choice.label }));

export const isRESTApiError = (res: AppInfo | RESTApiError): res is RESTApiError =>
  (res as RESTApiError).error != null || (res as RESTApiError).status === 'failure';

export const isFieldInvalid = (
  field: string | undefined,
  error: string | IErrorObject | string[]
): boolean => error !== undefined && error.length > 0 && field !== undefined;

// TODO: Remove when the applications are certified
export const isDeprecatedConnector = (connector: ServiceNowActionConnector) => {
  if (connector == null) {
    return true;
  }

  if (!ENABLE_NEW_SN_ITSM_CONNECTOR && connector.actionTypeId === '.servicenow') {
    return true;
  }

  if (!ENABLE_NEW_SN_SIR_CONNECTOR && connector.actionTypeId === '.servicenow-sir') {
    return true;
  }

  return connector.config.usesTableApi;
};
