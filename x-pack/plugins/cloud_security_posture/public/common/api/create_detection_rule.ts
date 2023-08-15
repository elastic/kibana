/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from '@kbn/core/public';

const DETECTION_ENGINE_URL = '/api/detection_engine' as const;
const DETECTION_ENGINE_RULES_URL = `${DETECTION_ENGINE_URL}/rules` as const;

interface RuleCreateProps {
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

export const createDetectionRule = async ({
  http,
  rule,
}: {
  http: HttpSetup;
  rule: RuleCreateProps;
}): Promise<RuleResponse> => {
  const res = await http.post<RuleCreateProps>(DETECTION_ENGINE_RULES_URL, {
    body: JSON.stringify(rule),
  });

  return res as RuleResponse;
};
