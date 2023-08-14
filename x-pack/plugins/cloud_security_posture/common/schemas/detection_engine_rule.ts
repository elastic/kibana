/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface RuleCreateProps {
  type: string;
  language: string;
  license: string;
  author: string[];
  filters: any[];
  false_positives: any[];
  risk_score: number;
  risk_score_mapping: any[];
  severity: string;
  severity_mapping: any[];
  threat: any[];
  interval: string;
  from: string;
  to: string;
  timestamp_override: string;
  timestamp_override_fallback_disabled: boolean;
  actions: any[];
  enabled: boolean;
  alert_suppression: {
    group_by: string[];
    missing_fields_strategy: string;
  };
  index: string[];
  query: string;
  references: string[];
  name: string;
  description: string;
  tags: string[];
  max_signals: number;
}

export interface RuleResponse extends RuleCreateProps {
  id: string;
}
