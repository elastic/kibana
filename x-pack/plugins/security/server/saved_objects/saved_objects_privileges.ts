/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FeaturesService } from '../plugin';
import {
  isSavedObjectConditionalPrivilege,
  SavedObjectPrivilegeCondition,
} from '../../../features/server/feature_kibana_privileges';

export class SavedObjectsPrivileges {
  private readonly conditionalTypes: string[];
  private readonly typesConditions: Map<
    string,
    Array<SavedObjectPrivilegeCondition | SavedObjectPrivilegeCondition[]>
  >;

  constructor(features: FeaturesService) {
    const savedObjectPrivileges = features
      .getFeatures()
      .map(feature => [
        ...(feature.privileges.all ? [feature.privileges.all] : []),
        ...(feature.privileges.read ? [feature.privileges.read] : []),
      ])
      .flat()
      .map(privilege => [...privilege.savedObject.all, ...privilege.savedObject.read])
      .flat()
      .filter(isSavedObjectConditionalPrivilege);

    this.conditionalTypes = savedObjectPrivileges.map(
      savedObjectPrivilege => savedObjectPrivilege.type
    );
    this.typesConditions = new Map();
    for (const savedObjectPrivilege of savedObjectPrivileges) {
      const { type, condition } = savedObjectPrivilege;
      this.typesConditions.set(type, [...(this.typesConditions.get(type) || []), condition]);
    }
  }

  public hasConditionalPrivileges(type: string): boolean {
    return this.conditionalTypes.includes(type);
  }

  public getConditions(
    type: string
  ): Array<SavedObjectPrivilegeCondition | SavedObjectPrivilegeCondition[]> {
    if (!this.typesConditions.has(type)) {
      throw new Error(`${type} doesn't have any conditions`);
    }
    return this.typesConditions.get(type)!;
  }
}
