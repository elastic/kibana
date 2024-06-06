/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { RuleObjectId } from '../../../../../../common/api/detection_engine';
import { withSecuritySpan } from '../../../../../utils/with_security_span';

export interface DeleteRuleProps {
  ruleId: RuleObjectId;
}

export const deleteRule = async (
  rulesClient: RulesClient,
  deleteRulePayload: DeleteRuleProps
): Promise<void> =>
  withSecuritySpan('DetectionRulesClient.deleteRule', async () => {
    const { ruleId } = deleteRulePayload;
    await rulesClient.delete({ id: ruleId });
  });
