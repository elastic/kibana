/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SAVED_QUERY_ID_REF_NAME, SAVED_QUERY_TYPE } from '../../constants';
import { FieldMigrator } from '../../utils/migrator';

export const timelineFieldsMigrator = new FieldMigrator([
  { path: 'attributes.savedQueryId', type: SAVED_QUERY_TYPE, name: SAVED_QUERY_ID_REF_NAME },
]);
