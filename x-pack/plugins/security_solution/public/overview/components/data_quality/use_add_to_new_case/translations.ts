/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ADD_TO_CASE_SUCCESS = i18n.translate(
  'xpack.securitySolution.dataQuality.addToCaseSuccessToast',
  {
    defaultMessage: 'Successfully added data quality details to the case',
  }
);

export const CREATE_A_DATA_QUALITY_CASE = (indexName: string) =>
  i18n.translate('xpack.securitySolution.dataQuality.addToCaseHeaderText', {
    values: { indexName },
    defaultMessage: 'Create a data quality case for index {indexName}',
  });
