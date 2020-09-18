/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface SearchBarFilter {
  key: string;
  value: string;
}

export const hostIpFilter: SearchBarFilter = {
  key: 'host.ip',
  value: '1.1.1.1',
};
