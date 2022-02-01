/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasePostRequest, ConnectorTypeFields } from '../../../common/api';
import { isInvalidTag } from '../../../common/utils/validators';
import { MAX_TITLE_LENGTH } from '../../../common/constants';
import {
  FIELD_TYPES,
  fieldValidators,
  FormSchema,
  VALIDATION_TYPES,
} from '../../common/shared_imports';
import * as i18n from './translations';

import { OptionalFieldLabel } from './optional_field_label';
const { emptyField, maxLengthField } = fieldValidators;

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
  ],
};

export type FormProps = Omit<CasePostRequest, 'connector' | 'settings' | 'owner'> & {
  connectorId: string;
  fields: ConnectorTypeFields['fields'];
  syncAlerts: boolean;
  selectedOwner?: string | null;
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
          message: i18n.MAX_LENGTH_ERROR('title', MAX_TITLE_LENGTH),
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
};
