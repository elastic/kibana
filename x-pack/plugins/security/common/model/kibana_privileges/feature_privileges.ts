/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FeaturesPrivileges } from '../features_privileges';
import { RawKibanaFeaturePrivileges } from '../raw_kibana_privileges';

export class KibanaFeaturePrivileges {
  constructor(private readonly featurePrivilegesMap: RawKibanaFeaturePrivileges) {}

  public getAllPrivileges(): FeaturesPrivileges {
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
