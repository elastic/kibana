/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SCHEMA_ERRORS_HEADING = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.schema.errors.heading',
  {
    defaultMessage: 'Schema Change Errors',
  }
);

export const SCHEMA_ERRORS_TABLE_FIELD_NAME_HEADER = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.schema.errors.header.fieldName',
  {
    defaultMessage: 'Field Name',
  }
);

export const SCHEMA_ERRORS_TABLE_DATA_TYPE_HEADER = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.schema.errors.header.dataType',
  {
    defaultMessage: 'Data Type',
  }
);

export const SCHEMA_FIELD_ERRORS_ERROR_MESSAGE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.schema.errors.message',
  {
    defaultMessage: 'Oops, we were not able to find any errors for this Schema.',
  }
);

export const SCHEMA_FIELD_ADDED_MESSAGE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.schema.fieldAdded.message',
  {
    defaultMessage: 'New field added.',
  }
);

export const SCHEMA_UPDATED_MESSAGE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.schema.updated.message',
  {
    defaultMessage: 'Schema updated.',
  }
);

export const SCHEMA_ADD_FIELD_BUTTON = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.schema.addField.button',
  {
    defaultMessage: 'Add field',
  }
);

export const SCHEMA_MANAGE_SCHEMA_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.schema.manage.title',
  {
    defaultMessage: 'Manage source schema',
  }
);

export const SCHEMA_MANAGE_SCHEMA_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.schema.manage.description',
  {
    defaultMessage: 'Add new fields or change the types of existing ones',
  }
);

export const SCHEMA_FILTER_PLACEHOLDER = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.schema.filter.placeholder',
  {
    defaultMessage: 'Filter schema fields...',
  }
);

export const SCHEMA_UPDATING = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.schema.updating',
  {
    defaultMessage: 'Updating schema...',
  }
);

export const SCHEMA_SAVE_BUTTON = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.schema.save.button',
  {
    defaultMessage: 'Save schema',
  }
);

export const SCHEMA_EMPTY_SCHEMA_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.schema.empty.title',
  {
    defaultMessage: 'Content source does not have a schema',
  }
);

export const SCHEMA_EMPTY_SCHEMA_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.schema.empty.description',
  {
    defaultMessage:
      'A schema is created for you once you index some documents. Click below to create schema fields in advance.',
  }
);
