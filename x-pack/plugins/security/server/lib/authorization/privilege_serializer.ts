/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const featurePrefix = 'feature_';
const spacePrefix = 'space_';
const minimumPrivilegeNames = ['all', 'read'];
const spaceMinimumPrivilegeNames = minimumPrivilegeNames.map(
  privilegeName => `${spacePrefix}${privilegeName}`
);

interface FeaturePrivilege {
  featureId: string;
  privilege: string;
}

export class PrivilegeSerializer {
  public static isGlobalMinimumPrivilege(privilegeName: string) {
    return minimumPrivilegeNames.includes(privilegeName);
  }

  public static isSpaceMinimumPrivilege(privilegeName: string) {
    return spaceMinimumPrivilegeNames.includes(privilegeName);
  }

  public static serializeGlobalMinimumPrivilege(privilegeName: string) {
    if (!minimumPrivilegeNames.includes(privilegeName)) {
      throw new Error('Unrecognized global minimum privilege');
    }

    return privilegeName;
  }

  public static serializeSpaceMinimumPrivilege(privilegeName: string) {
    if (!minimumPrivilegeNames.includes(privilegeName)) {
      throw new Error('Unrecognized space minimum privilege');
    }

    return `${spacePrefix}${privilegeName}`;
  }

  public static serializeFeaturePrivilege(featureName: string, privilegeName: string) {
    return `${featurePrefix}${featureName}.${privilegeName}`;
  }

  public static deserializeFeaturePrivilege(privilege: string): FeaturePrivilege {
    if (privilege.indexOf(featurePrefix) !== 0) {
      throw new Error(`privilege '${privilege}' was expected to start with '${featurePrefix}'`);
    }

    const withoutPrefix = privilege.slice(featurePrefix.length);
    const parts = withoutPrefix.split('.');
    if (parts.length !== 2) {
      throw new Error(`Unable to deserialize feature privilege '${privilege}'`);
    }

    return {
      featureId: parts[0],
      privilege: parts[1],
    };
  }

  public static deserializeGlobalMinimumPrivilege(privilege: string) {
    if (minimumPrivilegeNames.includes(privilege)) {
      return privilege;
    }

    throw new Error('Unrecognized global minimum privilege');
  }

  public static deserializeSpaceMinimumPrivilege(privilege: string) {
    if (!spaceMinimumPrivilegeNames.includes(privilege)) {
      throw new Error('Unrecognized space minimum privilege');
    }

    return privilege.slice(spacePrefix.length);
  }
}
