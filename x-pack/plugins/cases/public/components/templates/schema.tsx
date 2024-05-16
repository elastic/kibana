/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { FIELD_TYPES, FormSchema } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { VALIDATION_TYPES } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_LENGTH_PER_TAG,
  MAX_TAGS_PER_CASE,
  MAX_TITLE_LENGTH,
} from '../../../common/constants';
import { OptionalFieldLabel } from '../create/optional_field_label';
import { SEVERITY_TITLE } from '../severity/translations';
import * as i18n from './translations';
import type { TemplateFormProps } from './types';

const { emptyField, maxLengthField } = fieldValidators;
const isInvalidTag = (value: string) => value.trim() === '';

const isTagCharactersInLimit = (value: string) => value.trim().length > MAX_LENGTH_PER_TAG;

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
    ],
  },
  description: {
    label: i18n.DESCRIPTION,
    validations: [
      {
        validator: emptyField(i18n.REQUIRED_FIELD(i18n.DESCRIPTION)),
      },
    ],
  },
  caseFields: {
    title: {
      label: i18n.NAME,
      labelAppend: OptionalFieldLabel,
      validations: [
        {
          validator: maxLengthField({
            length: MAX_TITLE_LENGTH,
            message: i18n.MAX_LENGTH_ERROR('name', MAX_TITLE_LENGTH),
          }),
        },
      ],
    },
    description: {
      label: i18n.DESCRIPTION,
      labelAppend: OptionalFieldLabel,
      validations: [
        {
          validator: maxLengthField({
            length: MAX_DESCRIPTION_LENGTH,
            message: i18n.MAX_LENGTH_ERROR('description', MAX_DESCRIPTION_LENGTH),
          }),
        },
      ],
    },
    tags: {
      label: i18n.TAGS,
      helpText: i18n.TAGS_HELP,
      labelAppend: OptionalFieldLabel,
      validations: [
        {
          validator: ({ value }: { value: string | string[] }) => {
            if (
              (!Array.isArray(value) && isInvalidTag(value)) ||
              (Array.isArray(value) && value.length > 0 && value.find(isInvalidTag))
            ) {
              return {
                message: i18n.TAGS_EMPTY_ERROR,
              };
            }
          },
          type: VALIDATION_TYPES.ARRAY_ITEM,
          isBlocking: false,
        },
        {
          validator: ({ value }: { value: string | string[] }) => {
            if (
              (!Array.isArray(value) && isTagCharactersInLimit(value)) ||
              (Array.isArray(value) && value.length > 0 && value.some(isTagCharactersInLimit))
            ) {
              return {
                message: i18n.MAX_LENGTH_ERROR('tag', MAX_LENGTH_PER_TAG),
              };
            }
          },
          type: VALIDATION_TYPES.ARRAY_ITEM,
          isBlocking: false,
        },
        {
          validator: ({ value }: { value: string[] }) => {
            if (Array.isArray(value) && value.length > MAX_TAGS_PER_CASE) {
              return {
                message: i18n.MAX_TAGS_ERROR(MAX_TAGS_PER_CASE),
              };
            }
          },
        },
      ],
    },
    severity: {
      label: SEVERITY_TITLE,
      labelAppend: OptionalFieldLabel,
    },
    assignees: {
      labelAppend: OptionalFieldLabel,
    },
    category: {
      labelAppend: OptionalFieldLabel,
    },
    connectorId: {
      type: FIELD_TYPES.SUPER_SELECT,
      labelAppend: OptionalFieldLabel,
      label: i18n.CONNECTORS,
      defaultValue: 'none',
    },
    fields: {
      defaultValue: null,
    },
    syncAlerts: {
      helpText: i18n.SYNC_ALERTS_HELP,
      defaultValue: true,
      labelAppend: OptionalFieldLabel,
    },
  },
};
