/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const groupBy = {
  'slo.id': {
    terms: {
      field: 'slo.id',
    },
  },
  'slo.revision': {
    terms: {
      field: 'slo.revision',
    },
  },
  'slo.groupBy': {
    terms: {
      field: 'slo.groupBy',
    },
  },
  'slo.instanceId': {
    terms: {
      field: 'slo.instanceId',
    },
  },
  'slo.name': {
    terms: {
      field: 'slo.name',
    },
  },
  'slo.description': {
    terms: {
      field: 'slo.description',
    },
  },
  'slo.tags': {
    terms: {
      field: 'slo.tags',
    },
  },
  'slo.indicator.type': {
    terms: {
      field: 'slo.indicator.type',
    },
  },
  'slo.budgetingMethod': {
    terms: {
      field: 'slo.budgetingMethod',
    },
  },
  'slo.timeWindow.duration': {
    terms: {
      field: 'slo.timeWindow.duration',
    },
  },
  'slo.timeWindow.type': {
    terms: {
      field: 'slo.timeWindow.type',
    },
  },
  errorBudgetEstimated: {
    terms: {
      field: 'errorBudgetEstimated',
    },
  },
  // Differentiate the temporary document from the summary one
  isTempDoc: {
    terms: {
      field: 'isTempDoc',
    },
  },
  // optional fields: only specified for APM indicators. Must include missing_bucket:true
  'service.name': {
    terms: {
      field: 'service.name',
      missing_bucket: true,
    },
  },
  'service.environment': {
    terms: {
      field: 'service.environment',
      missing_bucket: true,
    },
  },
  'transaction.name': {
    terms: {
      field: 'transaction.name',
      missing_bucket: true,
    },
  },
  'transaction.type': {
    terms: {
      field: 'transaction.type',
      missing_bucket: true,
    },
  },
};
