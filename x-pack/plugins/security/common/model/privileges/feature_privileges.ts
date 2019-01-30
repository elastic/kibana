/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface FeaturePrivilegesMap {
  [featureId: string]: {
    [privilegeId: string]: string[];
  };
}

export interface FeaturePrivilegeSet {
  [featureId: string]: string[];
}

export class FeaturePrivileges {
  constructor(private readonly featurePrivilegesMap: FeaturePrivilegesMap) {}

  public getAllPrivileges(): FeaturePrivilegeSet {
    return Object.entries(this.featurePrivilegesMap).reduce((acc, [featureId, privileges]) => {
      return {
        ...acc,
        [featureId]: Object.keys(privileges),
      };
    }, {});
  }

  public getPrivileges(featureId: string): string[] {
    return Object.keys(this.featurePrivilegesMap[featureId]);
  }

  public getActions(featureId: string, privilege: string): string[] {
    if (!this.featurePrivilegesMap[featureId]) {
      return [];
    }
    return this.featurePrivilegesMap[featureId][privilege] || [];
  }
}
