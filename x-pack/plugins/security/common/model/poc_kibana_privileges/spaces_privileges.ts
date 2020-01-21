/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Privilege } from './privilege_instance';

export class KibanaSpacesPrivileges {
  constructor(private readonly spacesPrivilegesMap: Record<string, string[]>) {}

  public getAllPrivileges(): Privilege[] {
    return Object.entries(this.spacesPrivilegesMap).map(
      ([privilegeId, actions]) => new Privilege('base', privilegeId, actions)
    );
  }
}
