/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { RecoveredActionGroup } from './builtin_action_groups';

const DisabledActionGroupsByActionType: Record<string, string[]> = {
  [RecoveredActionGroup.id]: ['.jira', '.servicenow', '.resilient'],
};

export const DisabledActionTypeIdsForActionGroup: Map<string, string[]> = new Map(
  Object.entries(DisabledActionGroupsByActionType)
);

export function isActionGroupDisabledForActionTypeId(
  actionGroup: string,
  actionTypeId: string
): boolean {
  return (
    DisabledActionTypeIdsForActionGroup.has(actionGroup) &&
    DisabledActionTypeIdsForActionGroup.get(actionGroup)!.includes(actionTypeId)
  );
}
