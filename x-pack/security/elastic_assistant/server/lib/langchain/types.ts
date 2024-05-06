/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Replacement } from '@kbn/elastic-assistant-common';

export interface ResponseBody {
  data: string;
  connector_id: string;
  replacements?: Replacement[];
  status: string;
  trace_data?: {
    transaction_id: string;
    trace_id: string;
  };
}
