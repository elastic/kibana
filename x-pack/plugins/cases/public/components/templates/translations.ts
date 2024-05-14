/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export * from '../../common/translations';

export const TEMPLATE_TITLE = i18n.translate('xpack.cases.templates.title', {
  defaultMessage: 'Templates',
});

export const TEMPLATE_DESCRIPTION = i18n.translate('xpack.cases.templates.description', {
  defaultMessage: 'Template description.',
});

export const NO_TEMPLATES = i18n.translate('xpack.cases.templates.noTemplates', {
  defaultMessage: 'You do not have any templates yet',
});

export const ADD_TEMPLATE = i18n.translate('xpack.cases.templates.addTemplate', {
  defaultMessage: 'Add template',
});

export const CREATE_TEMPLATE = i18n.translate('xpack.cases.templates.createTemplate', {
  defaultMessage: 'Create template',
});

export const REQUIRED = i18n.translate('xpack.cases.templates.required', {
  defaultMessage: 'Required',
});

export const REQUIRED_FIELD = (fieldName: string): string =>
  i18n.translate('xpack.cases.templates.requiredField', {
    values: { fieldName },
    defaultMessage: 'A {fieldName} is required.',
  });

export const TEMPLATE_NAME = i18n.translate('xpack.cases.templates.templateName', {
  defaultMessage: 'Template name',
});

export const TEMPLATE_FIELDS = i18n.translate('xpack.cases.templates.templateFields', {
  defaultMessage: 'Template fields',
});

export const CASE_FIELDS = i18n.translate('xpack.cases.templates.caseFields', {
  defaultMessage: 'Case fields',
});

// export const SAVE = i18n.translate('xpack.cases.templates.saveTemplate', {
//   defaultMessage: 'Save',
// });
