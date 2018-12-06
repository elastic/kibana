/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const featurePrefix = 'feature_';
const spacePrefix = 'space_';
const minimumPrivilegeNames = ['all', 'read'];
const globalMinimumPrivileges = [...minimumPrivilegeNames];
const spaceMinimumPrivileges = minimumPrivilegeNames.map(
  privilegeName => `${spacePrefix}${privilegeName}`
);
const deserializeFeaturePrivilegeRegexp = new RegExp(
  `^${featurePrefix}([a-zA-Z0-9_-]+)\\.([a-zA-Z0-9_-]+)$`
);

interface FeaturePrivilege {
  featureId: string;
  privilege: string;
}

export class PrivilegeSerializer {
  public static isSerializedGlobalMinimumPrivilege(privilegeName: string) {
    return globalMinimumPrivileges.includes(privilegeName);
  }

  public static isSerializedSpaceMinimumPrivilege(privilegeName: string) {
    return spaceMinimumPrivileges.includes(privilegeName);
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

  public static serializeFeaturePrivilege(featureId: string, privilegeName: string) {
    return `${featurePrefix}${featureId}.${privilegeName}`;
  }

  public static deserializeFeaturePrivilege(privilege: string): FeaturePrivilege {
    const match = privilege.match(deserializeFeaturePrivilegeRegexp);
    if (!match) {
      throw new Error(`Feature privilege '${privilege}' didn't match pattern`);
    }

    return {
      featureId: match[1],
      privilege: match[2],
    };
  }

  public static deserializeGlobalMinimumPrivilege(privilege: string) {
    if (PrivilegeSerializer.isSerializedGlobalMinimumPrivilege(privilege)) {
      return privilege;
    }

    throw new Error('Unrecognized global minimum privilege');
  }

  public static deserializeSpaceMinimumPrivilege(privilege: string) {
    if (!PrivilegeSerializer.isSerializedSpaceMinimumPrivilege(privilege)) {
      throw new Error('Unrecognized space minimum privilege');
    }

    return privilege.slice(spacePrefix.length);
  }
}
