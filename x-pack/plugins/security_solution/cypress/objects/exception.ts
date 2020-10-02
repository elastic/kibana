/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface Exception {
  field: string;
  operator: string;
  values: string[];
}

export const exception: Exception = {
  field: 'host.name',
  operator: 'is one of',
  values: ['siem-kibana', 'suricata-iowa', 'siem-es', 'jessie', 'siem'],
};
