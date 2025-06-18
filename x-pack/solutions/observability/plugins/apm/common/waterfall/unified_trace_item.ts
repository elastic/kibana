/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface TraceItem {
  id: string;
  timestamp: string;
  name: string;
  traceId: string;
  duration: number;
  hasError?: boolean;
  parentId?: string;
  serviceName: string;
}
