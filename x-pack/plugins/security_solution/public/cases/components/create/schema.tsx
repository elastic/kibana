/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CasePostRequest } from '../../../../../case/common/api';
import { FIELD_TYPES, fieldValidators, FormSchema } from '../../../shared_imports';
import * as i18n from '../../translations';

import { OptionalFieldLabel } from './optional_field_label';
const { emptyField } = fieldValidators;

export const schemaTags = {
  type: FIELD_TYPES.COMBO_BOX,
  label: i18n.TAGS,
  helpText: i18n.TAGS_HELP,
  labelAppend: OptionalFieldLabel,
};

export const schema: FormSchema<CasePostRequest> = {
  title: {
    type: FIELD_TYPES.TEXT,
    label: i18n.NAME,
    validations: [
      {
        validator: emptyField(i18n.TITLE_REQUIRED),
      },
    ],
  },
  description: {
    label: i18n.DESCRIPTION,
    validations: [
      {
        validator: emptyField(i18n.DESCRIPTION_REQUIRED),
      },
    ],
  },
  tags: schemaTags,
};
