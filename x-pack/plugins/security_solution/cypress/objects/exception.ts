/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface Exception {
  field: string;
  operator: string;
  values: string[];
}

export const exception: Exception = {
  field: 'host.name',
  operator: 'is',
  values: ['suricata-iowa'],
};
