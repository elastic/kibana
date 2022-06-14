/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subscription } from 'rxjs';
import { filter } from 'rxjs';
import { throttleTime } from 'rxjs/operators';

import type { HttpStart } from '@kbn/core/public';

import type { SecurityLicense } from '../../common';

interface AnalyticsServiceSetupParams {
  securityLicense: SecurityLicense;
}

interface AnalyticsServiceStartParams {
  http: HttpStart;
}

/**
 * The signature of the authentication type used by the user and the timestamp
 * indicating when the signature was calculated.
 */
interface AuthTypeInfo {
  signature: string;
  timestamp: number;
}

export class AnalyticsService {
  public static AuthTypeInfoStorageKey = 'kibana.security.userAuthType';
  private securityLicense!: SecurityLicense;
  private securityFeaturesSubscription?: Subscription;

  public setup({ securityLicense }: AnalyticsServiceSetupParams) {
    this.securityLicense = securityLicense;
  }

  public start({ http }: AnalyticsServiceStartParams) {
    // Wait for the license info before recording authentication type. License
    // change events are throttled with 5s interval.
    this.securityFeaturesSubscription = this.securityLicense.features$
      .pipe(
        filter(({ allowLogin }) => allowLogin),
        throttleTime(5000)
      )
      .subscribe(async () => {
        try {
          await AnalyticsService.recordAuthTypeAnalytics(http);
        } catch {
          // do nothing
        }
      });
  }

  public stop() {
    if (this.securityFeaturesSubscription) {
      this.securityFeaturesSubscription.unsubscribe();
      this.securityFeaturesSubscription = undefined;
    }
  }

  private static async recordAuthTypeAnalytics(http: HttpStart) {
    localStorage.setItem(
      AnalyticsService.AuthTypeInfoStorageKey,
      JSON.stringify(
        await http.post<AuthTypeInfo>('/internal/security/analytics/_record_auth_type', {
          body: localStorage.getItem(AnalyticsService.AuthTypeInfoStorageKey),
        })
      )
    );
  }
}
