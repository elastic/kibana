/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { AuthenticationProvider } from '../../common/model';
import { LegacyAuditLogger } from './audit_service';

/**
 * @deprecated
 */
export class SecurityAuditLogger {
  constructor(private readonly logger: LegacyAuditLogger) {}

  /**
   * @deprecated
   */
  savedObjectsAuthorizationFailure(
    username: string,
    action: string,
    types: string[],
    spaceIds: string[],
    missing: Array<{ spaceId?: string; privilege: string }>,
    args?: Record<string, unknown>
  ) {
    const typesString = types.join(',');
    const spacesString = spaceIds.length ? ` in [${spaceIds.join(',')}]` : '';
    const missingString = missing
      .map(({ spaceId, privilege }) => `${spaceId ? `(${spaceId})` : ''}${privilege}`)
      .join(',');
    this.logger.log(
      'saved_objects_authorization_failure',
      `${username} unauthorized to [${action}] [${typesString}]${spacesString}: missing [${missingString}]`,
      {
        username,
        action,
        types,
        spaceIds,
        missing,
        args,
      }
    );
  }

  /**
   * @deprecated
   */
  savedObjectsAuthorizationSuccess(
    username: string,
    action: string,
    types: string[],
    spaceIds: string[],
    args?: Record<string, unknown>
  ) {
    const typesString = types.join(',');
    const spacesString = spaceIds.length ? ` in [${spaceIds.join(',')}]` : '';
    this.logger.log(
      'saved_objects_authorization_success',
      `${username} authorized to [${action}] [${typesString}]${spacesString}`,
      {
        username,
        action,
        types,
        spaceIds,
        args,
      }
    );
  }

  /**
   * @deprecated
   */
  accessAgreementAcknowledged(username: string, provider: AuthenticationProvider) {
    this.logger.log(
      'access_agreement_acknowledged',
      `${username} acknowledged access agreement (${provider.type}/${provider.name}).`,
      { username, provider }
    );
  }
}
