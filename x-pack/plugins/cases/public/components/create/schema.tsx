/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { fieldValidators } from '../../../../../../src/plugins/es_ui_shared/static/forms/helpers';
import {
  FIELD_TYPES,
  VALIDATION_TYPES,
} from '../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib/constants';
import type { FormSchema } from '../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib/types';
import type { CasePostRequest } from '../../../common/api/cases/case';
import type { ConnectorTypeFields } from '../../../common/api/connectors';
import { MAX_TITLE_LENGTH } from '../../../common/constants';
import { OptionalFieldLabel } from './optional_field_label';
import * as i18n from './translations';

const { emptyField, maxLengthField } = fieldValidators;

export const schemaTags = {
  type: FIELD_TYPES.COMBO_BOX,
  label: i18n.TAGS,
  helpText: i18n.TAGS_HELP,
  labelAppend: OptionalFieldLabel,
  validations: [
    {
      validator: emptyField(i18n.TAGS_EMPTY_ERROR),
      type: VALIDATION_TYPES.ARRAY_ITEM,
      isBlocking: false,
    },
  ],
};

export type FormProps = Omit<CasePostRequest, 'connector' | 'settings' | 'owner'> & {
  connectorId: string;
  fields: ConnectorTypeFields['fields'];
  syncAlerts: boolean;
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
