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
}

export interface ApiLogsData {
  results: ApiLog[];
  meta: Meta;
}
