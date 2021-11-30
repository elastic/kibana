/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subscription } from 'rxjs';

import type { HttpStart } from 'src/core/public';

import type { AuthenticatedUser, SecurityLicense } from '../../common';

interface SecurityUsageCollectionSetupParams {
  securityLicense: SecurityLicense;
}

interface SecurityUsageCollectionStartParams {
  http: HttpStart;
  getCurrentUser: () => Promise<AuthenticatedUser>;
}

interface SecurityUsageCollectionAuthType {
  username_hash: string;
  timestamp: number;
  auth_type: string;
}

export class SecurityUsageCollectionService {
  public static KeyAuthType = 'kibana-user-auth-type';
  private securityLicense!: SecurityLicense;
  private securityFeaturesSubscription?: Subscription;

  public setup({ securityLicense }: SecurityUsageCollectionSetupParams) {
    this.securityLicense = securityLicense;
  }

  public async start({ http, getCurrentUser }: SecurityUsageCollectionStartParams) {
    // wait for the user to be authenticated before doing UsageCollection
    this.securityFeaturesSubscription = this.securityLicense.features$.subscribe(
      ({ allowRbac }) => {
        if (allowRbac) {
          getCurrentUser().then(() => this.recordAuthTypeUsageCollection(http));
        }
      }
    );
  }

  public stop() {
    if (this.securityFeaturesSubscription) {
      this.securityFeaturesSubscription.unsubscribe();
      this.securityFeaturesSubscription = undefined;
    }
  }

  private async recordAuthTypeUsageCollection(http: HttpStart) {
    try {
      const UsageCollectionAuthTypeStringify = localStorage.getItem(
        SecurityUsageCollectionService.KeyAuthType
      );
      const UsageCollectionAuthTypeObj = await http.post<SecurityUsageCollectionAuthType | null>(
        '/internal/security/usage_collection/record_auth_type',
        {
          body: UsageCollectionAuthTypeStringify,
        }
      );
      if (UsageCollectionAuthTypeObj) {
        localStorage.setItem(
          SecurityUsageCollectionService.KeyAuthType,
          JSON.stringify(UsageCollectionAuthTypeObj)
        );
      }
    } catch (exp) {
      // do nothing
    }
  }
}
