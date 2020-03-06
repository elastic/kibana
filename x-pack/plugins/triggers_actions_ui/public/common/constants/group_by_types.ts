/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { GroupByType } from '../types';

export const builtInGroupByTypes: { [key: string]: GroupByType } = {
  all: {
    text: i18n.translate(
      'xpack.triggersActionsUI.common.constants.comparators.groupByTypes.allDocumentsLabel',
      {
        defaultMessage: 'all documents',
      }
    ),
    sizeRequired: false,
    value: 'all',
    validNormalizedTypes: [],
  },
  top: {
    text: i18n.translate(
      'xpack.triggersActionsUI.common.constants.comparators.groupByTypes.topLabel',
      {
        defaultMessage: 'top',
      }
    ),
    sizeRequired: true,
    value: 'top',
    validNormalizedTypes: ['number', 'date', 'keyword'],
  },
};
