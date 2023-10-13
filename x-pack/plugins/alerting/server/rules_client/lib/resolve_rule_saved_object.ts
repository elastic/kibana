/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsResolveResponse } from '@kbn/core/server';
import { withSpan } from '@kbn/apm-utils';
import { RuleTypeParams } from '../../types';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import { RulesClientContext } from '../types';
import { resolveRuleSo } from '../../data/rule';
import { RuleAttributes } from '../../data/rule/types';

interface ResolveRuleSavedObjectParams {
  ruleId: string;
}

export async function resolveRuleSavedObject<Params extends RuleTypeParams = never>(
  context: RulesClientContext,
  params: ResolveRuleSavedObjectParams
): Promise<SavedObjectsResolveResponse<RuleAttributes>> {
  const { ruleId } = params;

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.CREATE,
      outcome: 'unknown',
      savedObject: { type: 'alert', id: ruleId },
    })
  );

  return await withSpan({ name: 'unsecuredSavedObjectsClient.resolve', type: 'rules' }, () =>
    resolveRuleSo({
      id: ruleId,
      savedObjectsClient: context.unsecuredSavedObjectsClient,
    })
  );
}
