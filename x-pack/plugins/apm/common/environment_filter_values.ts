/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const ENVIRONMENT_ALL = 'ENVIRONMENT_ALL';
export const ENVIRONMENT_NOT_DEFINED = 'ENVIRONMENT_NOT_DEFINED';

const ENVIRONMENT_ALL_LABEL = i18n.translate('xpack.apm.environment.allLabel', {
  defaultMessage: 'All',
});
const ENVIRONMENT_NOT_DEFINED_LABEL = i18n.translate(
  'xpack.apm.filter.environment.notDefinedLabel',
  { defaultMessage: 'Not defined' }
);

export const ALL_OPTION = {
  value: ENVIRONMENT_ALL,
  text: ENVIRONMENT_ALL_LABEL,
};
export const NOT_DEFINED_OPTION = {
  value: ENVIRONMENT_NOT_DEFINED,
  text: ENVIRONMENT_NOT_DEFINED_LABEL,
};

export function getEnvironmentLabel(environment: string) {
  if (environment === ENVIRONMENT_ALL) {
    return ENVIRONMENT_ALL_LABEL;
  }
  if (environment === ENVIRONMENT_NOT_DEFINED) {
    return ENVIRONMENT_NOT_DEFINED_LABEL;
  }
  return environment;
}
