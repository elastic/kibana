/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigSchema } from '../../../config';

export enum SearchStatus {
  IN_PROGRESS = 'in_progress',
  ERROR = 'error',
  COMPLETE = 'complete',
}

export type SearchSessionsConfig = ConfigSchema['search']['sessions'];
