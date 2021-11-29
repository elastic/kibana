/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from 'src/core/public';

import type { AuthenticatedUser } from '../../common';

interface SecurityTelemetryStartParams {
  http: HttpStart;
  getCurrentUser: () => Promise<AuthenticatedUser>;
}

interface SecurityTelemetryAuthType {
  username_hash: string;
  timestamp: number;
  auth_type: string;
}

export class SecurityTelemetryService {
  public static KeyAuthType = 'kibana-user-auth-type';

  public async start({ http, getCurrentUser }: SecurityTelemetryStartParams) {
    // wait for the user to be authenticated before doing telemetry
    getCurrentUser().then(() => this.postAuthTypeTelemetry(http));
  }

  private async postAuthTypeTelemetry(http: HttpStart) {
    try {
      const telemetryAuthTypeStringify = localStorage.getItem(SecurityTelemetryService.KeyAuthType);
      const telemetryAuthTypeObj = await http.post<SecurityTelemetryAuthType>(
        '/internal/security/telemetry/auth_type',
        {
          body: telemetryAuthTypeStringify,
        }
      );
      localStorage.setItem(
        SecurityTelemetryService.KeyAuthType,
        JSON.stringify(telemetryAuthTypeObj)
      );
      // eslint-disable-next-line no-empty
    } catch (exp) {}
  }
}
