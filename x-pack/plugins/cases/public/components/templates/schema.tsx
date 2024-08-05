/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import type { FormSchema } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { VALIDATION_TYPES } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  MAX_TAGS_PER_TEMPLATE,
  MAX_TEMPLATE_TAG_LENGTH,
  MAX_TEMPLATE_NAME_LENGTH,
  MAX_TEMPLATE_DESCRIPTION_LENGTH,
} from '../../../common/constants';
import { OptionalFieldLabel } from '../optional_field_label';
import * as i18n from './translations';
import type { TemplateFormProps } from './types';
import {
  validateEmptyTags,
  validateMaxLength,
  validateMaxTagsLength,
} from '../case_form_fields/utils';
import { schema as caseFormFieldsSchema } from '../case_form_fields/schema';
const { emptyField, maxLengthField } = fieldValidators;

const nonOptionalFields = ['connectorId', 'fields', 'severity', 'customFields'];

// add optional label to all case form fields
export const caseFormFieldsSchemaWithOptionalLabel = Object.fromEntries(
  Object.entries(caseFormFieldsSchema).map(([key, value]) => {
    if (typeof value === 'object' && !nonOptionalFields.includes(key)) {
      const updatedValue = { ...value, labelAppend: OptionalFieldLabel };
      return [key, updatedValue];
    }

    return [key, value];
  })
);

export const schema: FormSchema<TemplateFormProps> = {
  key: {
    validations: [
      {
        validator: emptyField(i18n.REQUIRED_FIELD('key')),
      },
    ],
  },
  name: {
    label: i18n.TEMPLATE_NAME,
    validations: [
      {
        validator: emptyField(i18n.REQUIRED_FIELD(i18n.TEMPLATE_NAME)),
      },
      {
        validator: maxLengthField({
          length: MAX_TEMPLATE_NAME_LENGTH,
          message: i18n.MAX_LENGTH_ERROR('template name', MAX_TEMPLATE_NAME_LENGTH),
        }),
      },
    ],
  },
  templateDescription: {
    label: i18n.DESCRIPTION,
    labelAppend: OptionalFieldLabel,
    validations: [
      {
        validator: maxLengthField({
          length: MAX_TEMPLATE_DESCRIPTION_LENGTH,
          message: i18n.MAX_LENGTH_ERROR('template description', MAX_TEMPLATE_DESCRIPTION_LENGTH),
        }),
      },
    ],
  },
  templateTags: {
    label: i18n.TAGS,
    helpText: i18n.TEMPLATE_TAGS_HELP,
    labelAppend: OptionalFieldLabel,
    validations: [
      {
        validator: ({ value }: { value: string | string[] }) =>
          validateEmptyTags({ value, message: i18n.TAGS_EMPTY_ERROR }),
        type: VALIDATION_TYPES.ARRAY_ITEM,
        isBlocking: false,
      },
      {
        validator: ({ value }: { value: string | string[] }) =>
          validateMaxLength({
            value,
            message: i18n.MAX_LENGTH_ERROR('tag', MAX_TEMPLATE_TAG_LENGTH),
            limit: MAX_TEMPLATE_TAG_LENGTH,
          }),
        type: VALIDATION_TYPES.ARRAY_ITEM,
        isBlocking: false,
      },
      {
        validator: ({ value }: { value: string[] }) =>
          validateMaxTagsLength({
            value,
            message: i18n.MAX_TAGS_ERROR(MAX_TAGS_PER_TEMPLATE),
            limit: MAX_TAGS_PER_TEMPLATE,
          }),
      },
    ],
  },
  ...caseFormFieldsSchemaWithOptionalLabel,
};
