/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from '@kbn/core/public';
import { INTERNAL_BASE_ALERTING_API_PATH, RuleExecutionGap } from '@kbn/alerting-plugin/common';

export async function scheduleBackfill({
  http,
  ruleId,
  docId,
  gap,
}: {
  http: HttpSetup;
  ruleId: string;
  docId: string;
  gap: RuleExecutionGap;
}): Promise<string | null> {
  const res = await http.post(`${INTERNAL_BASE_ALERTING_API_PATH}/rules/backfill/_schedule`, {
    body: JSON.stringify({
      ids: [{ rule_id: ruleId, doc_id: docId }],
      start: gap.gapStart,
      end: gap.gapEnd,
    }),
  });
  const resultForRule = res.find((r) => r.rule_id === ruleId);
  return resultForRule.backfill_id ?? null;
}
