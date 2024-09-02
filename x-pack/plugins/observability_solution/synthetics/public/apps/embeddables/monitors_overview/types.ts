/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface Option {
  label: string;
  value: string;
}

export interface MonitorFilters {
  projects: Option[];
  tags: Option[];
  monitorIds: Option[];
  monitorTypes: Option[];
  locations: Option[];
}
