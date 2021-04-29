/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SAVE = i18n.translate('xpack.cases.header.editableTitle.save', {
  defaultMessage: 'Save',
});

export const CANCEL = i18n.translate('xpack.cases.header.editableTitle.cancel', {
  defaultMessage: 'Cancel',
});

export const EDIT_TITLE_ARIA = (title: string) =>
  i18n.translate('xpack.cases.header.editableTitle.editButtonAria', {
    values: { title },
    defaultMessage: 'You can edit {title} by clicking',
  });
