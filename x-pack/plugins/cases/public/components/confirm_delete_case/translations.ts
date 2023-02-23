/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
export * from '../../common/translations';

export const DELETE_TITLE = (caseTitle: string) =>
  i18n.translate('xpack.cases.confirmDeleteCase.deleteTitle', {
    values: { caseTitle },
    defaultMessage: 'Delete "{caseTitle}"',
  });

export const CONFIRM_QUESTION = (quantity: number) =>
  i18n.translate('xpack.cases.confirmDeleteCase.confirmQuestion', {
    values: { quantity },
    defaultMessage:
      'By deleting {quantity, plural, =1 {this case} other {these cases}}, all related case data will be permanently removed and you will no longer be able to push data to an external incident management system. Are you sure you wish to proceed?',
  });
