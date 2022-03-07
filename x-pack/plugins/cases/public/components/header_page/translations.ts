/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export * from '../../common/translations';

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

export const EXPERIMENTAL_LABEL = i18n.translate('xpack.cases.header.badge.experimentalLabel', {
  defaultMessage: 'Technical preview',
});

export const EXPERIMENTAL_DESC = i18n.translate('xpack.cases.header.badge.experimentalDesc', {
  defaultMessage:
    'This functionality is in technical preview and may be changed or removed completely in a future release. Elastic will take a best effort approach to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.',
});

export const BETA_LABEL = i18n.translate('xpack.cases.header.badge.betaLabel', {
  defaultMessage: 'Beta',
});

export const BETA_DESC = i18n.translate('xpack.cases.header.badge.betaDesc', {
  defaultMessage:
    'This feature is currently in beta. If you encounter any bugs or have feedback, please open an issue or visit our discussion forum.',
});
