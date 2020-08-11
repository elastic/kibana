/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const ENVIRONMENT_ALL = 'ENVIRONMENT_ALL';
export const ENVIRONMENT_NOT_DEFINED = 'ENVIRONMENT_NOT_DEFINED';

export function getEnvironmentLabel(environment: string) {
  if (environment === ENVIRONMENT_NOT_DEFINED) {
    return i18n.translate('xpack.apm.filter.environment.notDefinedLabel', {
      defaultMessage: 'Not defined',
    });
  }
  return environment;
}
