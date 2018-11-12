/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const featurePrefix = 'feature_';
const spacePrefix = 'space_';
const reservedPrivilegeNames = ['all', 'read'];

export class PrivilegeSerializer {
  public static serializeGlobalPrivilege(privilegeName: string) {
    return privilegeName;
  }

  public static serializeSpacePrivilege(privilegeName: string) {
    return `${spacePrefix}${privilegeName}`;
  }

  public static serializeFeaturePrivilege(featureName: string, privilegeName: string) {
    return `${featurePrefix}${featureName}_${privilegeName}`;
  }

  public static serializePrivilegeAssignedGlobally(privilege: string) {
    if (reservedPrivilegeNames.includes(privilege)) {
      return privilege;
    }

    return `${featurePrefix}${privilege}`;
  }

  public static serializePrivilegeAssignedAtSpace(privilege: string) {
    if (reservedPrivilegeNames.includes(privilege)) {
      return `${spacePrefix}${privilege}`;
    }

    return `${featurePrefix}${privilege}`;
  }

  public static deserializePrivilegeAssignedGlobally(privilege: string) {
    if (privilege.startsWith(featurePrefix)) {
      return privilege.slice(featurePrefix.length);
    }

    return privilege;
  }

  public static deserializePrivilegeAssignedAtSpace(privilege: string) {
    if (privilege.startsWith(featurePrefix)) {
      return privilege.slice(featurePrefix.length);
    }

    if (privilege.startsWith(spacePrefix)) {
      return privilege.slice(spacePrefix.length);
    }

    throw new Error(
      `Unable to deserialize ${privilege}, should have started with ${spacePrefix} or ${featurePrefix}`
    );
  }
}
