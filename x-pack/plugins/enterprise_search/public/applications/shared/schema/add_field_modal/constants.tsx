/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

export const FORM_ID = 'schemaAddFieldForm';

export const ADD_FIELD_MODAL_TITLE = i18n.translate(
  'xpack.enterpriseSearch.schema.addFieldModal.title',
  { defaultMessage: 'Add a new field' }
);
export const ADD_FIELD_MODAL_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.schema.addFieldModal.description',
  { defaultMessage: 'Once added, a field cannot be removed from your schema.' }
);
export const ADD_FIELD_BUTTON = i18n.translate(
  'xpack.enterpriseSearch.schema.addFieldModal.addFieldButtonLabel',
  { defaultMessage: 'Add field' }
);

export const FIELD_NAME_PLACEHOLDER = i18n.translate(
  'xpack.enterpriseSearch.schema.addFieldModal.fieldNamePlaceholder',
  { defaultMessage: 'Enter a field name' }
);
export const FIELD_NAME_CORRECT_NOTE = i18n.translate(
  'xpack.enterpriseSearch.schema.addFieldModal.fieldNameNote.correct',
  { defaultMessage: 'Field names can only contain lowercase letters, numbers, and underscores' }
);
export const FIELD_NAME_CORRECTED_NOTE = (correctedName: string) => (
  <FormattedMessage
    id="xpack.enterpriseSearch.schema.addFieldModal.fieldNameNote.corrected"
    defaultMessage="The field will be named {correctedName}"
    values={{
      correctedName: <strong>{correctedName}</strong>,
    }}
  />
);
