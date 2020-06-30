/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const SAVE = i18n.translate('xpack.securitySolution.header.editableTitle.save', {
  defaultMessage: 'Save',
});

export const CANCEL = i18n.translate('xpack.securitySolution.header.editableTitle.cancel', {
  defaultMessage: 'Cancel',
});

export const EDIT_TITLE_ARIA = (title: string) =>
  i18n.translate('xpack.securitySolution.header.editableTitle.editButtonAria', {
    values: { title },
    defaultMessage: 'You can edit {title} by clicking',
  });
