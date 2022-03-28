/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { SERVICE_ENVIRONMENT } from './elasticsearch_fieldnames';
import { Environment } from './environment_rt';

const ENVIRONMENT_ALL_VALUE = 'ENVIRONMENT_ALL' as const;
const ENVIRONMENT_NOT_DEFINED_VALUE = 'ENVIRONMENT_NOT_DEFINED' as const;

export const allOptionText = i18n.translate(
  'xpack.apm.filter.environment.allLabel',
  {
    defaultMessage: 'All',
  }
);

export function getEnvironmentLabel(environment: string) {
  if (!environment || environment === ENVIRONMENT_NOT_DEFINED_VALUE) {
    return i18n.translate('xpack.apm.filter.environment.notDefinedLabel', {
      defaultMessage: 'Not defined',
    });
  }

  if (environment === ENVIRONMENT_ALL_VALUE) {
    return allOptionText;
  }

  return environment;
}

// #TODO Once we replace the select dropdown we can remove it
// EuiSelect >  EuiSelectOption accepts text attribute
export const ENVIRONMENT_ALL_SELECT_OPTION = {
  value: ENVIRONMENT_ALL_VALUE,
  text: getEnvironmentLabel(ENVIRONMENT_ALL_VALUE),
};

export const ENVIRONMENT_ALL = {
  value: ENVIRONMENT_ALL_VALUE,
  label: getEnvironmentLabel(ENVIRONMENT_ALL_VALUE),
};

export const ENVIRONMENT_NOT_DEFINED = {
  value: ENVIRONMENT_NOT_DEFINED_VALUE,
  text: getEnvironmentLabel(ENVIRONMENT_NOT_DEFINED_VALUE),
};

export function getEnvironmentEsField(environment: string) {
  if (
    !environment ||
    environment === ENVIRONMENT_NOT_DEFINED_VALUE ||
    environment === ENVIRONMENT_ALL_VALUE
  ) {
    return {};
  }

  return { [SERVICE_ENVIRONMENT]: environment };
}

// returns the environment url param that should be used
// based on the requested environment. If the requested
// environment is different from the URL parameter, we'll
// return ENVIRONMENT_ALL. If it's not, we'll just return
// the current environment URL param
export function getNextEnvironmentUrlParam({
  requestedEnvironment,
  currentEnvironmentUrlParam,
}: {
  requestedEnvironment?: string;
  currentEnvironmentUrlParam: Environment;
}) {
  const normalizedRequestedEnvironment =
    requestedEnvironment || ENVIRONMENT_NOT_DEFINED.value;
  const normalizedQueryEnvironment =
    currentEnvironmentUrlParam || ENVIRONMENT_ALL.value;

  if (normalizedRequestedEnvironment === normalizedQueryEnvironment) {
    return currentEnvironmentUrlParam || ENVIRONMENT_ALL.value;
  }

  return ENVIRONMENT_ALL.value;
}
