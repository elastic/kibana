/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const STATUS = {
  FAILURE: 'FAILURE',
  SUCCESS: 'SUCCESS',
  LOADING: 'LOADING'
};

export const NOT_AVAILABLE_LABEL = i18n.translate(
  'xpack.apm.notAvailableLabel',
  {
    defaultMessage: 'N/A'
  }
);
