/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const STACK_BY = i18n.translate(
  'xpack.securitySolution.components.histogram.stackByOptions.stackByLabel',
  {
    defaultMessage: 'Stack by',
  }
);

export const ADD_TO_CASE_SUCCESS = (caseTitle: string) =>
  i18n.translate(
    'xpack.securitySolution.components.histogramActopms.addToCase.notificationSuccess',
    {
      defaultMessage: 'Successfully added visualization to the case: {caseTitle}',
      values: { caseTitle },
    }
  );

export const ADD_TO_CASE_FAILURE = i18n.translate(
  'xpack.securitySolution.components.histogramActopms.addToCase.notificationFailure',
  {
    defaultMessage: 'Failed to add visualization to the selected case.',
  }
);

export const VIEW_CASE = i18n.translate(
  'xpack.securitySolution.components.histogramActopms.addToCase.notification.viewCase',
  {
    defaultMessage: 'View case',
  }
);
