/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy, ComponentType } from 'react';
import { EuiSelectOption } from '@elastic/eui';
import { AppInfo, Choice, RESTApiError } from './types';
import { ActionConnector, IErrorObject } from '../../../../types';
import { deprecatedMessage } from '../../../../common/connectors_selection';

export const DEFAULT_CORRELATION_ID = '{{rule.id}}:{{alert.id}}';

export const choicesToEuiOptions = (choices: Choice[]): EuiSelectOption[] =>
  choices.map((choice) => ({ value: choice.value, text: choice.label }));

export const isRESTApiError = (res: AppInfo | RESTApiError): res is RESTApiError =>
  (res as RESTApiError).error != null || (res as RESTApiError).status === 'failure';

export const isFieldInvalid = (
  field: string | undefined | null,
  error: string | IErrorObject | string[]
): boolean => error !== undefined && error.length > 0 && field != null;

export const getConnectorDescriptiveTitle = (connector: ActionConnector) => {
  let title = connector.name;

  if (connector.isDeprecated) {
    title += ` ${deprecatedMessage}`;
  }

  return title;
};

export const getSelectedConnectorIcon = (
  actionConnector: ActionConnector
): React.LazyExoticComponent<ComponentType<{ actionConnector: ActionConnector }>> | undefined => {
  if (actionConnector.isDeprecated) {
    return lazy(() => import('./servicenow_selection_row'));
  }
};
