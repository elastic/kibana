/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from '@kbn/core/server';
import { withSpan } from '@kbn/apm-utils';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import { RulesClientContext } from '../types';
import { getRuleSo } from '../../data/rule';
import { RuleAttributes } from '../../data/rule/types';

interface GetRuleSavedObjectParams {
  ruleId: string;
}

export async function getRuleSavedObject(
  context: RulesClientContext,
  params: GetRuleSavedObjectParams
): Promise<SavedObject<RuleAttributes>> {
  const { ruleId } = params;

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.GET,
      outcome: 'unknown',
      savedObject: { type: 'alert', id: ruleId },
    })
  );

  return await withSpan({ name: 'unsecuredSavedObjectsClient.get', type: 'rules' }, () =>
    getRuleSo({
      id: ruleId,
      savedObjectsClient: context.unsecuredSavedObjectsClient,
    })
  );
}
