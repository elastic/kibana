/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum Projection {
  services = 'services',
  transactionGroups = 'transactionGroups',
  traces = 'traces',
  transactions = 'transactions',
  metrics = 'metrics',
  errorGroups = 'errorGroups',
  serviceNodes = 'serviceNodes',
  rumOverview = 'rumOverview',
}
