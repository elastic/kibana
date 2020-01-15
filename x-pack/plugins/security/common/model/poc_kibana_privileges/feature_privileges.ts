/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FeaturesPrivileges } from '../features_privileges';
import { RawKibanaFeaturePrivileges } from '../raw_kibana_privileges';
import { Privilege } from './privilege_instance';

export class KibanaFeaturePrivileges {
  constructor(private readonly featurePrivilegesMap: RawKibanaFeaturePrivileges) {}

  public getAllPrivileges(): FeaturesPrivileges {
    return Object.entries(this.featurePrivilegesMap).reduce((acc, [featureId, privileges]) => {
      return {
        ...acc,
        [featureId]: Object.entries(privileges).map(
          ([privilegeId, privilegeActions]) =>
            new Privilege('feature', privilegeId, privilegeActions)
        ),
      };
    }, {});
  }

  public getPrivileges(featureId: string): Privilege[] {
    const featurePrivileges = this.featurePrivilegesMap[featureId];
    if (featurePrivileges == null) {
      return [];
    }

    return Object.entries(featurePrivileges).map(
      ([privilegeId, privilegeActions]) => new Privilege('feature', privilegeId, privilegeActions)
    );
  }

  public getPrivilege(featureId: string, privilege: string): Privilege | null {
    if (!this.featurePrivilegesMap[featureId]) {
      return null;
    }
    return new Privilege(
      'feature',
      privilege,
      this.featurePrivilegesMap[featureId][privilege] || []
    );
  }
}
