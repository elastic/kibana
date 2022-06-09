/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IClusterClient, Logger } from '@kbn/core/server';

import type { AuthenticationProvider, UserData, UserInfo, UserProfile } from '../../common';
import { getDetailedErrorMessage, getErrorStatusCode } from '../errors';
import type { UserProfileGrant } from './user_profile_grant';

const KIBANA_DATA_ROOT = 'kibana';
const ACTIVATION_MAX_RETRIES = 3;
const ACTIVATION_RETRY_SCALE_DURATION_MS = 150;

export interface UserProfileServiceStart {
  /**
   * Activates user profile using provided user profile grant.
   * @param grant User profile grant (username/password or access token).
   */
  activate(grant: UserProfileGrant): Promise<UserProfile>;

  /**
   * Retrieves a single user profile by identifier.
   * @param uid User ID
   * @param dataPath By default `get()` returns user information, but does not return any user data. The optional "dataPath" parameter can be used to return personal data for this user.
   */
  get<T extends UserData>(uid: string, dataPath?: string): Promise<UserProfile<T>>;

  /**
   * Updates user preferences by identifier.
   * @param uid User ID
   * @param data Application data to be written (merged with existing data).
   */
  update<T extends UserData>(uid: string, data: T): Promise<void>;
}

type GetProfileResponse<T extends UserData> = Record<
  string,
  {
    uid: string;
    user: UserInfo;
    data: {
      [KIBANA_DATA_ROOT]: T;
    };
    access: {};
    enabled: boolean;
    last_synchronized: number;
    authentication_provider: AuthenticationProvider;
  }
>;

export interface UserProfileServiceStartParams {
  clusterClient: IClusterClient;
}

export class UserProfileService {
  constructor(private readonly logger: Logger) {}

  start({ clusterClient }: UserProfileServiceStartParams): UserProfileServiceStart {
    const { logger } = this;

    async function activate(grant: UserProfileGrant): Promise<UserProfile> {
      logger.debug(`Activating user profile via ${grant.type} grant.`);

      const activateGrant =
        grant.type === 'password'
          ? { grant_type: 'password', username: grant.username, password: grant.password }
          : { grant_type: 'access_token', access_token: grant.accessToken };

      // Profile activation is a multistep process that might or might not cause profile document to be created or
      // updated. If Elasticsearch needs to handle multiple profile activation requests for the same user in parallel
      // it can hit document version conflicts and fail (409 status code). In this case it's safe to retry activation
      // request after some time. Most of the Kibana users won't be affected by this issue, but there are edge cases
      // when users can be hit by the conflicts during profile activation, e.g. for PKI or Kerberos authentication when
      // client certificate/ticket changes and multiple requests can trigger profile re-activation at the same time.
      let activationRetriesLeft = ACTIVATION_MAX_RETRIES;
      do {
        try {
          const response = await clusterClient.asInternalUser.transport.request<UserProfile>({
            method: 'POST',
            path: '_security/profile/_activate',
            body: activateGrant,
          });

          logger.debug(`Successfully activated profile for "${response.user.username}".`);

          return response;
        } catch (err) {
          const detailedErrorMessage = getDetailedErrorMessage(err);
          if (getErrorStatusCode(err) !== 409) {
            logger.error(`Failed to activate user profile: ${detailedErrorMessage}.`);
            throw err;
          }

          activationRetriesLeft--;
          logger.error(
            `Failed to activate user profile (retries left: ${activationRetriesLeft}): ${detailedErrorMessage}.`
          );

          if (activationRetriesLeft === 0) {
            throw err;
          }
        }

        await new Promise((resolve) =>
          setTimeout(
            resolve,
            (ACTIVATION_MAX_RETRIES - activationRetriesLeft) * ACTIVATION_RETRY_SCALE_DURATION_MS
          )
        );
      } while (activationRetriesLeft > 0);

      // This should be unreachable code, unless we have a bug in retry handling logic.
      throw new Error('Failed to activate user profile, max retries exceeded.');
    }

    async function get<T extends UserData>(uid: string, dataPath?: string) {
      try {
        const body = await clusterClient.asInternalUser.transport.request<GetProfileResponse<T>>({
          method: 'GET',
          path: `_security/profile/${uid}${
            dataPath ? `?data=${KIBANA_DATA_ROOT}.${dataPath}` : ''
          }`,
        });
        return { ...body[uid], data: body[uid].data[KIBANA_DATA_ROOT] ?? {} };
      } catch (error) {
        logger.error(`Failed to retrieve user profile [uid=${uid}]: ${error.message}`);
        throw error;
      }
    }

    async function update<T extends UserData>(uid: string, data: T) {
      try {
        await clusterClient.asInternalUser.transport.request({
          method: 'POST',
          path: `_security/profile/${uid}/_data`,
          body: {
            data: {
              [KIBANA_DATA_ROOT]: data,
            },
          },
        });
      } catch (error) {
        logger.error(`Failed to update user profile [uid=${uid}]: ${error.message}`);
        throw error;
      }
    }

    return { activate, get, update };
  }
}
