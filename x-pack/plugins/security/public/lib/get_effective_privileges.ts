/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';
import {
  FeaturePrivileges,
  FeaturePrivilegeSet,
} from '../../common/model/privileges/feature_privileges';
import { PrivilegeDefinition } from '../../common/model/privileges/privilege_definition';
import { Role } from '../../common/model/role';

interface EffectivePrivilegeDefinition {
  global: {
    feature: {
      [featureId: string]: string[];
    };
  };
  space: {
    minimum: string[];
    feature: {
      [featureId: string]: string[];
    };
  };
}

export interface EffectivePrivileges {
  grants: EffectivePrivilegeDefinition;
  allows: EffectivePrivilegeDefinition;
}

export function getEffectivePrivileges(
  privilegeDefinition: PrivilegeDefinition,
  role: Role,
  spaceId?: string
): EffectivePrivileges {
  const { global } = role.kibana;
  const featurePrivileges = privilegeDefinition.getFeaturePrivileges();

  // get actions for all assigned privileges

  const globalMinimumActions: string[] = global.minimum.reduce(
    (acc: string[], privilege: string) => {
      return [...acc, ...privilegeDefinition.getGlobalPrivileges().getActions(privilege)];
    },
    []
  );

  const globalFeatureActions: string[] = getFeatureActions(featurePrivileges, global.feature);

  const allAssignedActions = [...globalMinimumActions, ...globalFeatureActions];

  const assignedActionExpressions = allAssignedActions.map(actionToRegExp);

  // Get all unassigned privileges
  const unassignedGlobalFeaturePrivilegeSet: FeaturePrivilegeSet = getUnassignedFeaturePrivileges(
    featurePrivileges,
    global.feature
  );

  // Test each one
  const effectiveGlobalFeatures: FeaturePrivilegeSet = {};

  Object.entries(unassignedGlobalFeaturePrivilegeSet).forEach(([featureId, privileges]) => {
    privileges.forEach(privilege => {
      const privilegeActions = featurePrivileges.getActions(featureId, privilege);
      const hasAllActions = privilegeActions.every((candidateAction: string) =>
        assignedActionExpressions.some((exp: RegExp) => exp.test(candidateAction))
      );
      if (hasAllActions) {
        effectiveGlobalFeatures[featureId] = [
          ...(effectiveGlobalFeatures[featureId] || []),
          privilege,
        ];
      } else {
        const missingActions = privilegeActions.filter(
          (candidateAction: string) =>
            !assignedActionExpressions.some((exp: RegExp) => exp.test(candidateAction))
        );

        // console.log(featureId, 'not granted because of missing actions', {
        //   missingActions,
        //   assignedActionExpressions,
        // });
      }
    });
  });

  const allowedGlobalFeaturePrivileges: FeaturePrivilegeSet = {};
  Object.entries(featurePrivileges.getAllPrivileges()).forEach(([featureId, privileges]) => {
    if (!effectiveGlobalFeatures.hasOwnProperty(featureId)) {
      // No effective privilege for this feature. All privileges should be allowed.
      allowedGlobalFeaturePrivileges[featureId] = [
        ...(allowedGlobalFeaturePrivileges[featureId] || []),
        ...privileges,
      ];
      return;
    }

    privileges.forEach(privilege => {
      const candidateAllowedPrivilegeActionExpressions = featurePrivileges
        .getActions(featureId, privilege)
        .map(actionToRegExp);

      const effectivePrivileveActions = effectiveGlobalFeatures[featureId].reduce(
        (acc, effectivePrivilege) => {
          return [...acc, ...featurePrivileges.getActions(featureId, effectivePrivilege)];
        },
        [] as string[]
      );

      const hasAllActions = effectivePrivileveActions.every((candidateAction: string) =>
        candidateAllowedPrivilegeActionExpressions.some((exp: RegExp) => exp.test(candidateAction))
      );

      if (hasAllActions) {
        allowedGlobalFeaturePrivileges[featureId] = [
          ...(allowedGlobalFeaturePrivileges[featureId] || []),
          privilege,
        ];
      }
    });
  });

  const allowedSpaceMinimumPrivileges: string[] = [];
  const spacePrivileges = privilegeDefinition.getSpacesPrivileges();
  spacePrivileges.getAllPrivileges().forEach(privilege => {
    const candidateSpacePrivilegeActionExpressions = spacePrivileges
      .getActions(privilege)
      .map(actionToRegExp);

    const hasAllActions = globalMinimumActions.every((candidateAction: string) =>
      candidateSpacePrivilegeActionExpressions.some((exp: RegExp) => exp.test(candidateAction))
    );

    if (hasAllActions) {
      allowedSpaceMinimumPrivileges.push(privilege);
    } else {
      // const missingActions = globalMinimumActions.filter(
      //   (candidateAction: string) =>
      //     !candidateSpacePrivilegeActionExpressions.some((exp: RegExp) => exp.test(candidateAction))
      // );
      // console.log('not assigning space privilege', { privilege, missingActions });
    }
  });

  const effectivePrivileges: EffectivePrivileges = {
    grants: {
      global: {
        feature: effectiveGlobalFeatures,
      },
      space: {
        minimum: [...global.minimum],
        feature: {},
      },
    },
    allows: {
      global: {
        feature: allowedGlobalFeaturePrivileges,
      },
      space: {
        minimum: allowedSpaceMinimumPrivileges,
        feature: {},
      },
    },
  };

  if (spaceId) {
    getEffectiveSpacePrivileges(
      privilegeDefinition,
      role,
      spaceId,
      effectivePrivileges,
      allAssignedActions
    );
  }

  return effectivePrivileges;
}

function getEffectiveSpacePrivileges(
  privilegeDefinition: PrivilegeDefinition,
  role: Role,
  spaceId: string,
  effectivePrivileges: EffectivePrivileges,
  globalAssignedActions: string[]
): EffectivePrivileges {
  const { global, space } = role.kibana;
  const featurePrivileges = privilegeDefinition.getFeaturePrivileges();

  const actualSpacePrivileges = space[spaceId] || effectivePrivileges.grants.space;

  // get actions for all assigned privileges
  const spaceMinimumActions: string[] = actualSpacePrivileges.minimum.reduce(
    (acc: string[], privilege: string) => {
      return [...acc, ...privilegeDefinition.getSpacesPrivileges().getActions(privilege)];
    },
    []
  );

  const spaceFeatureActions: string[] = getFeatureActions(
    featurePrivileges,
    actualSpacePrivileges.feature
  );

  const allAssignedActions = [
    ...globalAssignedActions,
    ...spaceMinimumActions,
    ...spaceFeatureActions,
  ];

  const assignedActionExpressions = allAssignedActions.map(actionToRegExp);

  // Get all unassigned privileges
  const unassignedSpaceFeaturePrivilegeSet: FeaturePrivilegeSet = getUnassignedFeaturePrivileges(
    featurePrivileges,
    actualSpacePrivileges.feature
  );

  // Test each one
  const effectiveSpaceFeatures: FeaturePrivilegeSet = {};

  Object.entries(unassignedSpaceFeaturePrivilegeSet).forEach(([featureId, privileges]) => {
    privileges.forEach(privilege => {
      const privilegeActions = featurePrivileges.getActions(featureId, privilege);
      const hasAllActions = privilegeActions.every((candidateAction: string) =>
        assignedActionExpressions.some((exp: RegExp) => exp.test(candidateAction))
      );
      if (hasAllActions) {
        effectiveSpaceFeatures[featureId] = [
          ...(effectiveSpaceFeatures[featureId] || []),
          privilege,
        ];
      } else {
        const missingActions = privilegeActions.filter(
          (candidateAction: string) =>
            !assignedActionExpressions.some((exp: RegExp) => exp.test(candidateAction))
        );

        // console.log(featureId, 'not granted because of missing actions', {
        //   spaceId,
        //   missingActions,
        //   assignedActionExpressions,
        // });
      }
    });
  });

  const allowedSpaceFeaturePrivileges: FeaturePrivilegeSet = {};
  Object.entries(featurePrivileges.getAllPrivileges()).forEach(([featureId, privileges]) => {
    if (!effectiveSpaceFeatures.hasOwnProperty(featureId)) {
      // No effective privilege for this feature. All privileges should be allowed.
      allowedSpaceFeaturePrivileges[featureId] = [
        ...(allowedSpaceFeaturePrivileges[featureId] || []),
        ...privileges,
      ];
      return;
    }

    privileges.forEach(privilege => {
      const candidateAllowedPrivilegeActionExpressions = featurePrivileges
        .getActions(featureId, privilege)
        .map(actionToRegExp);

      const effectivePrivileveActions = effectiveSpaceFeatures[featureId].reduce(
        (acc, effectivePrivilege) => {
          return [...acc, ...featurePrivileges.getActions(featureId, effectivePrivilege)];
        },
        [] as string[]
      );

      const hasAllActions = effectivePrivileveActions.every((candidateAction: string) =>
        candidateAllowedPrivilegeActionExpressions.some((exp: RegExp) => exp.test(candidateAction))
      );

      if (hasAllActions) {
        allowedSpaceFeaturePrivileges[featureId] = [
          ...(allowedSpaceFeaturePrivileges[featureId] || []),
          privilege,
        ];
      }
    });
  });

  effectivePrivileges.grants.space.feature = effectiveSpaceFeatures;
  effectivePrivileges.allows.space.feature = allowedSpaceFeaturePrivileges;

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

function getFeatureActions(
  featurePrivileges: FeaturePrivileges,
  assignedFeaturePrivilegeSet: FeaturePrivilegeSet
) {
  return Object.entries(assignedFeaturePrivilegeSet).reduce(
    (acc: string[], [featureId, privileges]) => {
      const featurePrivilegeActions: string[] = privileges.reduce(
        (featureAcc, privilege) => {
          return [...featureAcc, ...featurePrivileges.getActions(featureId, privilege)];
        },
        [] as string[]
      );

      return [...acc, ...featurePrivilegeActions];
    },
    []
  );
}

function getUnassignedFeaturePrivileges(
  featurePrivileges: FeaturePrivileges,
  assignedFeaturePrivilegeSet: FeaturePrivilegeSet
): FeaturePrivilegeSet {
  const featurePrivilegeSet: FeaturePrivilegeSet = featurePrivileges.getAllPrivileges();

  const unassignedFeaturePrivileges: FeaturePrivilegeSet = {};

  Object.entries(featurePrivilegeSet).forEach(([featureId, privileges]) => {
    if (assignedFeaturePrivilegeSet.hasOwnProperty(featureId)) {
      const unassignedPrivs = _.difference(privileges, assignedFeaturePrivilegeSet[featureId]);
      unassignedFeaturePrivileges[featureId] = unassignedPrivs;
    } else {
      unassignedFeaturePrivileges[featureId] = [...privileges];
    }
  });

  return unassignedFeaturePrivileges;
}
