/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  XPackUsageContract,
  XPackUsageResponse,
  SecurityRealm,
} from 'x-pack/plugins/xpack_main/server/lib/xpack_usage';

export class ClusterSecurityFeatures {
  private currentXPackUsage: XPackUsageResponse | undefined;

  private enabledRealms: SecurityRealm[] | undefined;

  constructor(xpackUsage: XPackUsageContract) {
    xpackUsage.getUsage$().subscribe({
      next: updatedUsage => this.updateCurrentUsage(updatedUsage),
    });
  }

  public isSAMLRealmEnabled(): boolean {
    return this.enabledRealms ? this.enabledRealms.includes('saml') : false;
  }

  public isTokenServiceEnabled(): boolean {
    if (!this.currentXPackUsage) {
      return false;
    }

    return this.currentXPackUsage.security.token_service.enabled;
  }

  public isAPIKeyServiceEnabled(): boolean {
    if (!this.currentXPackUsage) {
      return false;
    }

    return this.currentXPackUsage.security.api_key_service.enabled;
  }

  private updateCurrentUsage(incomingUsage: XPackUsageResponse | undefined) {
    this.currentXPackUsage = incomingUsage;

    if (this.currentXPackUsage) {
      const { realms } = this.currentXPackUsage.security;
      this.enabledRealms = Object.keys(realms).filter<SecurityRealm>((realmId):realmId is SecurityRealm => realms[realmId as SecurityRealm]!.enabled);
    } else {
      this.enabledRealms = [];
    }
  }
}
