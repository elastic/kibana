/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ALERT_SEVERITY, ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import { DEFAULT_QUERY_SIZE } from '../helpers';

export const severityAgg = {
  statusBySeverity: {
    terms: {
      field: ALERT_SEVERITY,
    },
  },
};

export const hostAgg = {
  alertsByHost: {
    terms: {
      field: 'host.name',
      size: 10,
    },
  },
};

export const detectionsAgg = {
  alertsByRule: {
    terms: {
      field: ALERT_RULE_NAME,
      size: 10,
    },
    aggs: {
      ruleByEventType: {
        terms: {
          field: 'event.type',
          size: DEFAULT_QUERY_SIZE,
        },
      },
    },
  },
};

export const aggregations = {
  detections: detectionsAgg,
  severity: severityAgg,
  host: hostAgg,
};
