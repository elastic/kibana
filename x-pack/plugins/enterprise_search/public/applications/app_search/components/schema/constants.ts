/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SCHEMA_TITLE = i18n.translate('xpack.enterpriseSearch.appSearch.engine.schema.title', {
  defaultMessage: 'Schema',
});

export const ADD_SCHEMA_ERROR = (fieldName: string) =>
  i18n.translate('xpack.enterpriseSearch.appSearch.engine.schema.addSchemaErrorMessage', {
    defaultMessage: 'Field name already exists: {fieldName}',
    values: { fieldName },
  });
export const ADD_SCHEMA_SUCCESS = (fieldName: string) =>
  i18n.translate('xpack.enterpriseSearch.appSearch.engine.schema.addSchemaSuccessMessage', {
    defaultMessage: 'New field added: {fieldName}',
    values: { fieldName },
  });
export const UPDATE_SCHEMA_SUCCESS = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.schema.updateSchemaSuccessMessage',
  { defaultMessage: 'Schema updated' }
);
