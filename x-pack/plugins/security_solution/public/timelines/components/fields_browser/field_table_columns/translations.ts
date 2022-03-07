/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const NAME = i18n.translate('xpack.securitySolution.fieldBrowser.fieldName', {
  defaultMessage: 'Name',
});

export const DESCRIPTION = i18n.translate('xpack.securitySolution.fieldBrowser.descriptionLabel', {
  defaultMessage: 'Description',
});

export const DESCRIPTION_FOR_FIELD = (field: string) =>
  i18n.translate('xpack.securitySolution.fieldBrowser.descriptionForScreenReaderOnly', {
    values: {
      field,
    },
    defaultMessage: 'Description for field {field}:',
  });

export const CATEGORY = i18n.translate('xpack.securitySolution.fieldBrowser.categoryLabel', {
  defaultMessage: 'Category',
});

export const RUNTIME = i18n.translate('xpack.securitySolution.fieldBrowser.runtimeLabel', {
  defaultMessage: 'Runtime',
});

export const RUNTIME_FIELD = i18n.translate('xpack.securitySolution.fieldBrowser.runtimeTitle', {
  defaultMessage: 'Runtime Field',
});
