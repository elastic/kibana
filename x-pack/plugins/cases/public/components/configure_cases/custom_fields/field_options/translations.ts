/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export * from '../../../../common/translations';

export const REQUIRED = i18n.translate('xpack.cases.configureCases.fieldOptions.required', {
  defaultMessage: 'Make this field required',
});

export const CHARACTER_LIMIT = i18n.translate(
  'xpack.cases.configureCases.fieldOptions.characterLimit',
  {
    defaultMessage: 'Limit character count to 120',
  }
);

export const MULTIPLE_SELECTIONS = i18n.translate(
  'xpack.cases.configureCases.fieldOptions.multipleSelections',
  {
    defaultMessage: 'Allow multiple selections',
  }
);

export const CUSTOM_VALUES = i18n.translate(
  'xpack.cases.configureCases.fieldOptions.customValues',
  {
    defaultMessage: 'Allow custom values',
  }
);
