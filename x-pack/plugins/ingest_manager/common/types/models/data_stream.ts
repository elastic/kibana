/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface DataStream {
  index: string;
  dataset: string;
  namespace: string;
  type: string;
  package: string;
  package_version: string;
  last_activity: string;
  size_in_bytes: number;
  dashboards: Array<{
    id: string;
    title: string;
  }>;
}
