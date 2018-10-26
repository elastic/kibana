/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface Capabilities {
  [key: string]: boolean;
}

export class UserProfile {
  private capabilities: Capabilities;
  constructor(profileData: Capabilities = {}) {
    this.capabilities = {
      ...profileData,
    };
  }

  public hasCapability(capability: string, defaultValue: boolean = true): boolean {
    return capability in this.capabilities ? this.capabilities[capability] : defaultValue;
  }

  public canAccessFeature(feature: string, defaultValue: boolean = true): boolean {
    return this.hasCapability(`ui:${feature}/read`, defaultValue);
  }

  public canReadSavedObject(savedObjectType: string, defaultValue: boolean = true): boolean {
    return this.hasCapability(`action:saved_objects/${savedObjectType}/get`, defaultValue);
  }

  public canWriteSavedObject(savedObjectType: string, defaultValue: boolean = true): boolean {
    return this.hasCapability(`action:saved_objects/${savedObjectType}/create`, defaultValue);
  }

  public canDeleteSavedObject(savedObjectType: string, defaultValue: boolean = true): boolean {
    return this.hasCapability(`action:saved_objects/${savedObjectType}/delete`, defaultValue);
  }

  public canShareFeature(feature: string, defaultValue: boolean = true): boolean {
    return this.hasCapability(`action:features/${feature}/share`, defaultValue);
  }

  public toJSON() {
    return {
      ...this.capabilities,
    };
  }
}
