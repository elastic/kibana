/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';

export function getEffectivePrivileges(
  privilegeActionMap: Record<string, { actions: string[] }>,
  assignedPrivileges: string[]
) {
  const privilegeExpressions = Object.entries(privilegeActionMap).reduce(
    (acc, [privilege, entry]) => ({
      ...acc,
      [privilege]: entry.actions.map(actionToRegExp),
    }),
    {}
  );

  const assignedActionExpressions: RegExp[] = assignedPrivileges.reduce(
    // @ts-ignore
    (acc, privilege) => [...acc, ...privilegeExpressions[privilege]],
    []
  );

  const candidatePrivileges: string[] = Object.keys(privilegeActionMap).filter(
    privilege => !assignedPrivileges.includes(privilege)
  );

  const effectivePrivileges = candidatePrivileges.filter(candidate => {
    // @ts-ignore
    const candidateActions = privilegeActionMap[candidate].actions;

    const hasAllActions = candidateActions.every((candidateAction: string) =>
      assignedActionExpressions.some((exp: RegExp) => exp.test(candidateAction))
    );
    return hasAllActions;
  });

  return effectivePrivileges;
}

function actionToRegExp(action: string) {
  // Actions are strings that may or may not end with a wildcard ("*").
  // This will excape all characters in the action string that are not the wildcard character.
  // Each wildcard character is then turned into a ".*" before the entire thing is turned into a regexp.
  return new RegExp(
    action
      .split('*')
      .map(part => _.escapeRegExp(part))
      .join('.*')
  );
}
