/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tableDefaults } from '@kbn/securitysolution-data-table';
import type { SubsetDataTableModel } from '@kbn/securitysolution-data-table';
import { defaultEventHeaders } from './default_event_headers';

export const eventsDefaultModel: SubsetDataTableModel = {
  ...tableDefaults,
  columns: defaultEventHeaders,
};
