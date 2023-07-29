/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from '@kbn/core/public';
import type {
  RuleCreateProps,
  RuleResponse,
} from '@kbn/security-solution-plugin/common/api/detection_engine';

const DETECTION_ENGINE_URL = '/api/detection_engine' as const;
const DETECTION_ENGINE_RULES_URL = `${DETECTION_ENGINE_URL}/rules` as const;

/**
 * Creates a detection rule
 *
 */
export async function createDetectionRule({
  http,
  rule,
}: {
  http: HttpSetup;
  rule: RuleCreateProps;
}): Promise<RuleResponse> {
  const res = await http.post<RuleCreateProps>(DETECTION_ENGINE_RULES_URL, {
    body: JSON.stringify(rule),
  });

  return res as RuleResponse;
}
