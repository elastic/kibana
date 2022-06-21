/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SecurityActivateUserProfileRequest,
  SecuritySuggestUserProfilesResponse,
} from '@elastic/elasticsearch/lib/api/types';
import type { SecurityUserProfile } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { IClusterClient, Logger } from '@kbn/core/server';

import type { BasicUserProfile, UserProfile, UserProfileData } from '../../common';
import type { AuthorizationServiceSetupInternal } from '../authorization';
import type { CheckUserProfilesPrivilegesResponse } from '../authorization/types';
import { getDetailedErrorMessage, getErrorStatusCode } from '../errors';
import type { UserProfileGrant } from './user_profile_grant';

const KIBANA_DATA_ROOT = 'kibana';
const ACTIVATION_MAX_RETRIES = 3;
const ACTIVATION_RETRY_SCALE_DURATION_MS = 150;
const MAX_SUGGESTIONS_COUNT = 100;
const DEFAULT_SUGGESTIONS_COUNT = 10;
const MIN_SUGGESTIONS_FOR_PRIVILEGES_CHECK = 10;

export interface UserProfileServiceStart {
  /**
   * Retrieves multiple user profiles by their identifiers.
   * @param params Bulk get operation parameters.
   * @param params.uids List of user profile identifiers.
   * @param params.dataPath By default Elasticsearch returns user information, but does not return any user data. The
   * optional "dataPath" parameter can be used to return personal data for the requested user profiles.
   */
  bulkGet<D extends UserProfileData>(
    params: UserProfileBulkGetParams
  ): Promise<Array<BasicUserProfile<D>>>;

  /**
   * Retrieves a single user profile by identifier.
   * @param params Suggest operation parameters.
   * @param params.name Query string used to match name-related fields in user profiles. The following fields are
   * treated as name-related: username, full_name and email.
   * @param params.dataPath By default API returns user information, but does not return any user data. The optional
   * "dataPath" parameter can be used to return personal data for this user (within `kibana` namespace).
   */
  suggest<D extends UserProfileData>(
    params: UserProfileSuggestParams
  ): Promise<Array<BasicUserProfile<D>>>;
}

export interface UserProfileServiceStartInternal extends UserProfileServiceStart {
  /**
   * Activates user profile using provided user profile grant.
   * @param grant User profile grant (username/password or access token).
   */
  activate(grant: UserProfileGrant): Promise<UserProfile>;

  /**
   * Retrieves a single user profile by its identifier.
   * @param uid User profile identifier.
   * @param dataPath By default Elasticsearch returns user information, but does not return any user data. The optional
   * "dataPath" parameter can be used to return personal data for the requested user profile.
   */
  get<D extends UserProfileData>(uid: string, dataPath?: string): Promise<UserProfile<D>>;

  /**
   * Updates user preferences by identifier.
   * @param uid User ID
   * @param data Application data to be written (merged with existing data).
   */
  update<D extends UserProfileData>(uid: string, data: D): Promise<void>;
}

export interface UserProfileServiceSetupParams {
  authz: AuthorizationServiceSetupInternal;
}

export interface UserProfileServiceStartParams {
  clusterClient: IClusterClient;
}

/**
 * The set of privileges that users associated with the suggested user profile should have for a specified space id.
 */
export interface UserProfileRequiredPrivileges {
  /**
   * The id of the Kibana Space.
   */
  spaceId: string;

  /**
   * The set of the Kibana specific application privileges.
   */
  privileges: { kibana: string[] };
}

/**
 * Parameters for the bulk get API.
 */
export interface UserProfileBulkGetParams {
  /**
   * List of user profile identifiers.
   */
  uids: Set<string>;

  /**
   * By default, suggest API returns user information, but does not return any user data. The optional "dataPath"
   * parameter can be used to return personal data for this user (within `kibana` namespace only).
   */
  dataPath?: string;
}

/**
 * Parameters for the suggest API.
 */
export interface UserProfileSuggestParams {
  /**
   * Query string used to match name-related fields in user profiles. The following fields are treated as
   * name-related: username, full_name and email.
   */
  name: string;

  /**
   * Desired number of suggestion to return. The default value is 10.
   */
  size?: number;

  /**
   * By default, suggest API returns user information, but does not return any user data. The optional "dataPath"
   * parameter can be used to return personal data for this user (within `kibana` namespace only).
   */
  dataPath?: string;

  /**
   * The set of the privileges that users associated with the suggested user profile should have in the specified space.
   * If not specified, privileges check isn't performed and all matched profiles are returned irrespective to the
   * privileges of the associated users.
   */
  requiredPrivileges?: UserProfileRequiredPrivileges;
}

function parseBasicUserProfile<D extends UserProfileData>(
  rawUserProfile: SecurityUserProfile
): BasicUserProfile<D> {
  return {
    uid: rawUserProfile.uid,
    // @ts-expect-error @elastic/elasticsearch SecurityActivateUserProfileResponse.enabled: boolean
    enabled: rawUserProfile.enabled,
    data: rawUserProfile.data?.[KIBANA_DATA_ROOT] ?? {},
    user: {
      username: rawUserProfile.user.username,
      // @elastic/elasticsearch types support `null` values for the `email`, but we don't.
      email: rawUserProfile.user.email ?? undefined,
      // @elastic/elasticsearch types support `null` values for the `full_name`, but we don't.
      full_name: rawUserProfile.user.full_name ?? undefined,
      // @ts-expect-error @elastic/elasticsearch SecurityUserProfileUser.display_name?: string
      display_name: rawUserProfile.user.display_name ?? undefined,
    },
  };
}

function parseUserProfile<D extends UserProfileData>(
  rawUserProfile: SecurityUserProfile
): UserProfile<D> {
  const basicUserProfile = parseBasicUserProfile<D>(rawUserProfile);
  return {
    ...basicUserProfile,
    labels: rawUserProfile.labels?.[KIBANA_DATA_ROOT] ?? {},
    user: {
      ...basicUserProfile.user,
      roles: rawUserProfile.user.roles,
      // @ts-expect-error @elastic/elasticsearch SecurityUserProfileUser.realm_name: string
      realm_name: rawUserProfile.user.realm_name,
      // @ts-expect-error @elastic/elasticsearch SecurityUserProfileUser.realm_domain?: string
      realm_domain: rawUserProfile.user.realm_domain,
    },
  };
}

export class UserProfileService {
  private authz?: AuthorizationServiceSetupInternal;
  constructor(private readonly logger: Logger) {}

  setup({ authz }: UserProfileServiceSetupParams) {
    this.authz = authz;
  }

  start({ clusterClient }: UserProfileServiceStartParams) {
    return {
      activate: this.activate.bind(this, clusterClient),
      get: this.get.bind(this, clusterClient),
      bulkGet: this.bulkGet.bind(this, clusterClient),
      update: this.update.bind(this, clusterClient),
      suggest: this.suggest.bind(this, clusterClient),
    } as UserProfileServiceStartInternal;
  }

  /**
   * See {@link UserProfileServiceStartInternal} for documentation.
   */
  private async activate(clusterClient: IClusterClient, grant: UserProfileGrant) {
    this.logger.debug(`Activating user profile via ${grant.type} grant.`);

    const activateRequest: SecurityActivateUserProfileRequest =
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
        const response = await clusterClient.asInternalUser.security.activateUserProfile(
          activateRequest
        );

        this.logger.debug(`Successfully activated profile for "${response.user.username}".`);

        return parseUserProfile<{}>(response);
      } catch (err) {
        const detailedErrorMessage = getDetailedErrorMessage(err);
        if (getErrorStatusCode(err) !== 409) {
          this.logger.error(`Failed to activate user profile: ${detailedErrorMessage}.`);
          throw err;
        }

        activationRetriesLeft--;
        this.logger.error(
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

  /**
   * See {@link UserProfileServiceStartInternal} for documentation.
   */
  private async get<D extends UserProfileData>(
    clusterClient: IClusterClient,
    uid: string,
    dataPath?: string
  ) {
    try {
      const body = await clusterClient.asInternalUser.security.getUserProfile({
        uid,
        data: dataPath ? `${KIBANA_DATA_ROOT}.${dataPath}` : undefined,
      });
      return parseUserProfile<D>(body[uid]!);
    } catch (error) {
      this.logger.error(
        `Failed to retrieve user profile [uid=${uid}]: ${getDetailedErrorMessage(error)}`
      );
      throw error;
    }
  }

  /**
   * See {@link UserProfileServiceStartInternal} for documentation.
   */
  private async bulkGet<D extends UserProfileData>(
    clusterClient: IClusterClient,
    { uids, dataPath }: UserProfileBulkGetParams
  ): Promise<Array<BasicUserProfile<D>>> {
    if (uids.size === 0) {
      return [];
    }

    try {
      // Use `transport.request` since `.security.suggestUserProfiles` implementation doesn't accept `hint` as a body
      // parameter yet.
      const body =
        await clusterClient.asInternalUser.transport.request<SecuritySuggestUserProfilesResponse>({
          method: 'POST',
          path: '_security/profile/_suggest',
          body: {
            hint: { uids: [...uids] },
            // We need at most as many results as requested uids.
            size: uids.size,
            data: dataPath ? `${KIBANA_DATA_ROOT}.${dataPath}` : undefined,
          },
        });

      return (
        body.profiles
          // "uuids" is just a hint that allows to put user profiles with the requested uids on the top of the
          // returned list, but if Elasticsearch cannot find user profiles for all requested uids it might include
          // other "matched" user profiles as well.
          .filter((rawProfile) => uids.has(rawProfile.uid))
          .map((rawProfile) => parseBasicUserProfile<D>(rawProfile))
      );
    } catch (error) {
      this.logger.error(`Failed to bulk get user profiles: ${getDetailedErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * See {@link UserProfileServiceStartInternal} for documentation.
   */
  private async update<D extends UserProfileData>(
    clusterClient: IClusterClient,
    uid: string,
    data: D
  ) {
    try {
      await clusterClient.asInternalUser.security.updateUserProfileData({
        uid,
        data: { [KIBANA_DATA_ROOT]: data },
      });
    } catch (error) {
      this.logger.error(
        `Failed to update user profile [uid=${uid}]: ${getDetailedErrorMessage(error)}`
      );
      throw error;
    }
  }

  /**
   * See {@link UserProfileServiceStartInternal} for documentation.
   */
  private async suggest<D extends UserProfileData>(
    clusterClient: IClusterClient,
    params: UserProfileSuggestParams
  ): Promise<Array<BasicUserProfile<D>>> {
    const { name, size = DEFAULT_SUGGESTIONS_COUNT, dataPath, requiredPrivileges } = params;
    if (size > MAX_SUGGESTIONS_COUNT) {
      throw Error(
        `Can return up to ${MAX_SUGGESTIONS_COUNT} suggestions, but ${size} suggestions were requested.`
      );
    }

    // 1. If privileges are not defined, request as many results as has been requested
    // 2. If privileges are defined, request two times more suggestions than requested to account
    // for the results that don't pass privileges check, but not less than minimal batch size
    // used to perform privileges check (fetching is cheap, privileges check is not).
    const numberOfResultsToRequest =
      (requiredPrivileges?.privileges.kibana.length ?? 0) > 0
        ? Math.max(size * 2, MIN_SUGGESTIONS_FOR_PRIVILEGES_CHECK)
        : size;

    try {
      const body = await clusterClient.asInternalUser.security.suggestUserProfiles({
        name,
        size: numberOfResultsToRequest,
        // If fetching data turns out to be a performance bottleneck, we can try to fetch data
        // only for the profiles that pass privileges check as a separate bulkGet request.
        data: dataPath ? `${KIBANA_DATA_ROOT}.${dataPath}` : undefined,
      });

      const filteredProfiles =
        requiredPrivileges && requiredPrivileges?.privileges.kibana.length > 0
          ? await this.filterProfilesByPrivileges(body.profiles, requiredPrivileges, size)
          : body.profiles;
      return filteredProfiles.map((rawProfile) => parseBasicUserProfile<D>(rawProfile));
    } catch (error) {
      this.logger.error(
        `Failed to get user profiles suggestions [name=${name}]: ${getDetailedErrorMessage(error)}`
      );
      throw error;
    }
  }

  private async filterProfilesByPrivileges(
    profilesToFilter: SecurityUserProfile[],
    requiredPrivileges: UserProfileRequiredPrivileges,
    requiredSize: number
  ): Promise<SecurityUserProfile[]> {
    // First try to check privileges for the maximum amount of profiles prioritizing a happy path i.e. first
    // `requiredSize` profiles have all necessary privileges. Otherwise, check privileges for the remaining profiles in
    // reasonably sized batches to optimize network round-trips until we find `requiredSize` profiles with necessary
    // privileges, or we check all returned profiles.
    const filteredProfiles = [];
    while (profilesToFilter.length > 0 && filteredProfiles.length < requiredSize) {
      const profilesBatch: Map<string, SecurityUserProfile> = new Map(
        profilesToFilter
          .splice(
            0,
            Math.max(requiredSize - filteredProfiles.length, MIN_SUGGESTIONS_FOR_PRIVILEGES_CHECK)
          )
          .map((profile) => [profile.uid, profile])
      );

      const profileUidsToFilter = new Set(profilesBatch.keys());
      let response: CheckUserProfilesPrivilegesResponse;
      try {
        response = await this.authz!.checkUserProfilesPrivileges(profileUidsToFilter).atSpace(
          requiredPrivileges.spaceId,
          requiredPrivileges.privileges
        );
      } catch (error) {
        this.logger.error(
          `Failed to check required privileges for the suggested profiles: ${getDetailedErrorMessage(
            error
          )}`
        );
        throw error;
      }

      const unknownUids = [];
      for (const profileUid of response.hasPrivilegeUids) {
        const filteredProfile = profilesBatch.get(profileUid);
        if (filteredProfile) {
          filteredProfiles.push(filteredProfile);
        } else {
          unknownUids.push(profileUid);
        }
      }

      // Log unknown profile UIDs.
      if (unknownUids.length > 0) {
        this.logger.error(`Privileges check API returned unknown profile UIDs: ${unknownUids}.`);
      }

      // Log profile UIDs for which an error was encountered.
      if (response.errorUids.length > 0) {
        this.logger.error(
          `Privileges check API failed for the following user profiles: ${response.errorUids}.`
        );
      }
    }

    return filteredProfiles;
  }
}
