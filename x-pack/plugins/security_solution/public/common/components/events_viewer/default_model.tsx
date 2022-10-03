/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SubsetTGridModel } from '../../../timelines/store/data_table/model';
import { defaultEventHeaders } from './default_event_headers';
import { tableDefaults } from '../../../timelines/store/timeline/defaults';

export const eventsDefaultModel: SubsetTGridModel = {
  ...tableDefaults,
  columns: defaultEventHeaders,
};
