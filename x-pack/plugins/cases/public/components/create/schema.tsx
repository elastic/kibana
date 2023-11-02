/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FormSchema } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { FIELD_TYPES, VALIDATION_TYPES } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import type { ConnectorTypeFields } from '../../../common/types/domain';
import type { CasePostRequest } from '../../../common/types/api';
import {
  MAX_TITLE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_LENGTH_PER_TAG,
  MAX_TAGS_PER_CASE,
} from '../../../common/constants';
import * as i18n from './translations';

import { OptionalFieldLabel } from './optional_field_label';
import { SEVERITY_TITLE } from '../severity/translations';
const { emptyField, maxLengthField } = fieldValidators;

const isInvalidTag = (value: string) => value.trim() === '';

const isTagCharactersInLimit = (value: string) => value.trim().length > MAX_LENGTH_PER_TAG;

export const schemaTags = {
  type: FIELD_TYPES.COMBO_BOX,
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
};

export type FormProps = Omit<
  CasePostRequest,
  'connector' | 'settings' | 'owner' | 'customFields'
> & {
  connectorId: string;
  fields: ConnectorTypeFields['fields'];
  syncAlerts: boolean;
  selectedOwner?: string | null;
  customFields: Record<string, string | boolean>;
};

export const schema: FormSchema<FormProps> = {
  title: {
    type: FIELD_TYPES.TEXT,
    label: i18n.NAME,
    validations: [
      {
        validator: emptyField(i18n.TITLE_REQUIRED),
      },
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
    validations: [
      {
        validator: emptyField(i18n.DESCRIPTION_REQUIRED),
      },
      {
        validator: maxLengthField({
          length: MAX_DESCRIPTION_LENGTH,
          message: i18n.MAX_LENGTH_ERROR('description', MAX_DESCRIPTION_LENGTH),
        }),
      },
    ],
  },
  selectedOwner: {
    label: i18n.SOLUTION,
    type: FIELD_TYPES.RADIO_GROUP,
    validations: [
      {
        validator: emptyField(i18n.SOLUTION_REQUIRED),
      },
    ],
  },
  tags: schemaTags,
  severity: {
    label: SEVERITY_TITLE,
  },
  connectorId: {
    type: FIELD_TYPES.SUPER_SELECT,
    label: i18n.CONNECTORS,
    defaultValue: 'none',
  },
  fields: {
    defaultValue: null,
  },
  syncAlerts: {
    helpText: i18n.SYNC_ALERTS_HELP,
    type: FIELD_TYPES.TOGGLE,
    defaultValue: true,
  },
  assignees: {},
  category: {},
};
