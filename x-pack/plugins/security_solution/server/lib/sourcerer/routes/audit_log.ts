/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsEventOutcome, EcsEventType } from '@kbn/logging';
import type { AuditEvent } from '../../../../../security/server';
import { SavedObjectAction } from '../../../../../security/server';
import { DATA_VIEW_SAVED_OBJECT_TYPE } from '../../../../../../../src/plugins/data_views/common';

function getSourcererSavedObjectAction(value: string): string {
  return Object.entries(SourcererSavedObjectAction).find(
    ([key, val]) => val === value
  )?.[0] as string;
}
export const SourcererSavedObjectAction = {
  [getSourcererSavedObjectAction(SavedObjectAction.CREATE)]: SavedObjectAction.CREATE,
  [getSourcererSavedObjectAction(SavedObjectAction.UPDATE)]: SavedObjectAction.UPDATE,
} as const;
export type SourcererSavedObjectAction = SavedObjectAction.CREATE | SavedObjectAction.UPDATE;
export interface SourcererSavedObjectEventParams {
  action: SourcererSavedObjectAction;
  outcome?: EcsEventOutcome;
  id: string;
  error?: Error;
}

const savedObjectAuditVerbs: Record<SourcererSavedObjectAction, [string, string, string]> = {
  [SavedObjectAction.CREATE]: ['create', 'creating', 'created'],
  [SavedObjectAction.UPDATE]: ['update', 'updating', 'updated'],
};

const savedObjectAuditTypes: Record<SourcererSavedObjectAction, EcsEventType> = {
  [SavedObjectAction.CREATE]: 'creation',
  [SavedObjectAction.UPDATE]: 'change',
};

export function sourcererSavedObjectEvent({
  action,
  id,
  outcome,
  error,
}: SourcererSavedObjectEventParams): AuditEvent | undefined {
  const doc = `${DATA_VIEW_SAVED_OBJECT_TYPE} [id=${id}]`;
  const [present, progressive, past] = savedObjectAuditVerbs[action];
  const message = error
    ? `Failed attempt to ${present} ${doc}`
    : outcome === 'unknown'
    ? `Kibana is ${progressive} ${doc}`
    : `Kibana has ${past} ${doc}`;
  const type = savedObjectAuditTypes[action];

  return {
    message,
    event: {
      action,
      category: ['database'],
      type: [type],
      outcome: outcome ?? (error ? 'failure' : 'success'),
    },
    kibana: {
      saved_object: {
        id,
        type: DATA_VIEW_SAVED_OBJECT_TYPE,
      },
    },
    error: error && {
      code: error.name,
      message: error.message,
    },
  };
}
