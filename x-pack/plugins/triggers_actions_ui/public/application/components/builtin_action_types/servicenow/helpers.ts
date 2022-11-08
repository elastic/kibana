/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSelectOption } from '@elastic/eui';
import { IErrorObject } from '../../../../../public/types';
import { AppInfo, Choice, RESTApiError, ServiceNowActionConnector } from './types';

export const DEFAULT_CORRELATION_ID = '{{rule.id}}:{{alert.id}}';

export const choicesToEuiOptions = (choices: Choice[]): EuiSelectOption[] =>
  choices.map((choice) => ({ value: choice.value, text: choice.label }));

export const isRESTApiError = (res: AppInfo | RESTApiError): res is RESTApiError =>
  (res as RESTApiError).error != null || (res as RESTApiError).status === 'failure';

export const isFieldInvalid = (
  field: string | undefined | null,
  error: string | IErrorObject | string[]
): boolean => error !== undefined && error.length > 0 && field != null;

// TODO: Remove when the applications are certified
export const isDeprecatedConnector = (connector?: ServiceNowActionConnector): boolean => {
  if (connector == null) {
    return false;
  }

  if (connector.actionTypeId === '.servicenow' || connector.actionTypeId === '.servicenow-sir') {
    /**
     * Connector's prior to the Elastic ServiceNow application
     * use the Table API (https://developer.servicenow.com/dev.do#!/reference/api/rome/rest/c_TableAPI)
     * Connectors after the Elastic ServiceNow application use the
     * Import Set API (https://developer.servicenow.com/dev.do#!/reference/api/rome/rest/c_ImportSetAPI)
     * A ServiceNow connector is considered deprecated if it uses the Table API.
     */
    return !!connector.config.usesTableApi;
  }

  return false;
};
