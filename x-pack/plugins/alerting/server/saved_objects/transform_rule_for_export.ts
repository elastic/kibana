/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from 'kibana/server';
import { AuditLogger } from '../../../security/server';
import { AlertAuditAction, alertAuditEvent } from '../alerts_client/audit_events';
import { RawAlert } from '../types';

export function transformRulesForExport(
  rules: SavedObject[],
  auditLogger: AuditLogger | undefined
): Array<SavedObject<RawAlert>> {
  return rules.map((rule) => transformRuleForExport(rule as SavedObject<RawAlert>, auditLogger));
}

export function transformRuleForExport(
  rule: SavedObject<RawAlert>,
  auditLogger: AuditLogger | undefined
): SavedObject<RawAlert> {
  auditLogger?.log(
    alertAuditEvent({
      action: AlertAuditAction.EXPORT,
      savedObject: { type: 'alert', id: rule.id },
    })
  );
  return {
    ...rule,
    attributes: {
      ...rule.attributes,
      enabled: false,
      apiKey: null,
      apiKeyOwner: null,
      scheduledTaskId: null,
    },
  };
}
