/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta } from '../../../../../common/types';

export interface ApiLog {
  timestamp: string; // Date ISO string
  status: number;
  http_method: string;
  full_request_path: string;
  user_agent: string;
  request_body: string; // JSON string
  response_body: string; // JSON string
  // NOTE: The API also sends us back `path: null`, but we don't appear to be
  // using it anywhere, so I've opted not to list it in our types
}

export interface ApiLogsData {
  results: ApiLog[];
  meta: Meta;
  // NOTE: The API sends us back even more `meta` data than the normal (sort_direction, filters, query),
  // but we currently don't use that data in our front-end code, so I'm opting not to list them in our types
}
