/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const DATAVIEW_NOT_FOUND = (dataViewId: string): string =>
  i18n.translate('xpack.securitySolution.riskEngine.calculateScores.dataViewNotFoundError', {
    values: { dataViewId },
    defaultMessage:
      'The specified dataview ({dataViewId}) was not found. Please use an existing dataview.',
  });

export const OPTIONAL_DATAVIEW_NOT_FOUND = (dataViewId: string): string =>
  i18n.translate(
    'xpack.securitySolution.riskEngine.calculateScores.optionalDataViewNotFoundError',
    {
      values: { dataViewId },
      defaultMessage:
        'The specified dataview ({dataViewId}) was not found. Please use an existing dataview, or omit the parameter to use the default risk inputs.',
    }
  );
