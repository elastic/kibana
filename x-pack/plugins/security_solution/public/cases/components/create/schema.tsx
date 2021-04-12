/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasePostRequest, ConnectorTypeFields } from '../../../../../cases/common/api';
import { FIELD_TYPES, fieldValidators, FormSchema } from '../../../shared_imports';
import * as i18n from './translations';

import { OptionalFieldLabel } from './optional_field_label';
const { emptyField } = fieldValidators;

export const schemaTags = {
  type: FIELD_TYPES.COMBO_BOX,
  label: i18n.TAGS,
  helpText: i18n.TAGS_HELP,
  labelAppend: OptionalFieldLabel,
};

export type FormProps = Omit<CasePostRequest, 'connector' | 'settings'> & {
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
  fields: {},
  syncAlerts: {
    helpText: i18n.SYNC_ALERTS_HELP,
    type: FIELD_TYPES.TOGGLE,
    defaultValue: true,
  },
};
