/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityActivateUserProfileRequest } from '@elastic/elasticsearch/lib/api/types';
import type { SecurityUserProfile } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { IClusterClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { PublicMethodsOf } from '@kbn/utility-types';

import type {
  SecurityLicense,
  UserProfile,
  UserProfileData,
  UserProfileLabels,
  UserProfileWithSecurity,
} from '../../common';
import type { AuthorizationServiceSetupInternal } from '../authorization';
import type { CheckUserProfilesPrivilegesResponse } from '../authorization/types';
import { getDetailedErrorMessage, getErrorStatusCode } from '../errors';
import { getPrintableSessionId, type Session } from '../session_management';
import type { UserProfileGrant } from './user_profile_grant';

const KIBANA_DATA_ROOT = 'kibana';
const ACTIVATION_MAX_RETRIES = 10;
const ACTIVATION_RETRY_SCALE_DURATION_MS = 150;
const MAX_SUGGESTIONS_COUNT = 100;
const DEFAULT_SUGGESTIONS_COUNT = 10;
const MIN_SUGGESTIONS_FOR_PRIVILEGES_CHECK = 10;

/**
 * A set of methods to work with Kibana user profiles.
 */
export interface UserProfileServiceStart {
  /**
   * Retrieves a user profile for the current user extracted from the specified request. If the profile isn't available,
   * e.g. for the anonymous users or users authenticated via authenticating proxies, the `null` value is returned.
   * @param params Get current user profile operation parameters.
   * @param params.request User request instance to get user profile for.
   * @param params.dataPath By default Elasticsearch returns user information, but does not return any user data. The
   * optional "dataPath" parameter can be used to return personal data for the requested user profiles.
   */
  getCurrent<D extends UserProfileData, L extends UserProfileLabels>(
    params: UserProfileGetCurrentParams
  ): Promise<UserProfileWithSecurity<D, L> | null>;

  /**
   * Retrieves multiple user profiles by their identifiers.
   * @param params Bulk get operation parameters.
   * @param params.uids List of user profile identifiers.
   * @param params.dataPath By default Elasticsearch returns user information, but does not return any user data. The
   * optional "dataPath" parameter can be used to return personal data for the requested user profiles.
   */
  bulkGet<D extends UserProfileData>(
    params: UserProfileBulkGetParams
  ): Promise<Array<UserProfile<D>>>;

  /**
   * Suggests multiple user profiles by search criteria.
   * @param params Suggest operation parameters.
   * @param params.name Query string used to match name-related fields in user profiles. The following fields are treated as name-related: username, full_name and email.
   * @param params.size Desired number of suggestion to return. The default value is 10.
   * @param params.dataPath By default, suggest API returns user information, but does not return any user data. The optional "dataPath" parameter can be used to return personal data for this user (within `kibana` namespace only).
   * @param params.requiredPrivileges The set of the privileges that users associated with the suggested user profile should have in the specified space. If not specified, privileges check isn't performed and all matched profiles are returned irrespective to the privileges of the associated users.
   */
  suggest<D extends UserProfileData>(
    params: UserProfileSuggestParams
  ): Promise<Array<UserProfile<D>>>;
}

export interface UserProfileServiceStartInternal extends UserProfileServiceStart {
  /**
   * Activates user profile using provided user profile grant.
   * @param grant User profile grant (username/password or access token).
   */
  activate(grant: UserProfileGrant): Promise<UserProfileWithSecurity>;

  /**
   * Updates user preferences by identifier.
   * @param uid User ID
   * @param data Application data to be written (merged with existing data).
   */
  update<D extends UserProfileData>(uid: string, data: D): Promise<void>;
}

export interface UserProfileServiceSetupParams {
  authz: AuthorizationServiceSetupInternal;
  license: SecurityLicense;
}

export interface UserProfileServiceStartParams {
  clusterClient: IClusterClient;
  session: PublicMethodsOf<Session>;
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
 * Parameters for the get user profile for the current user API.
 */
export interface UserProfileGetCurrentParams {
  /**
   * User request instance to get user profile for.
   */
  request: KibanaRequest;

  /**
   * By default, get API returns user information, but does not return any user data. The optional "dataPath"
   * parameter can be used to return personal data for this user (within `kibana` namespace only).
   */
  dataPath?: string;
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
  name?: string;

  /**
   * Extra search criteria to improve relevance of the suggestion result. A profile matching the
   * specified hint is ranked higher in the response. But not-matching the hint does not exclude a
   * profile from the response as long as it matches the `name` field query.
   */
  hint?: {
    /**
     * A list of Profile UIDs to match against.
     */
    uids: string[];
  };

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

function parseUserProfile<D extends UserProfileData>(
  rawUserProfile: SecurityUserProfile
): UserProfile<D> {
  return {
    uid: rawUserProfile.uid,
    // Get User Profile API returns `enabled` property, but Suggest User Profile API doesn't since it's assumed that the
    // API returns only enabled profiles. To simplify the API in Kibana we use the same interfaces for user profiles
    // irrespective to the source they are coming from, so we need to "normalize" `enabled` property here.
    enabled: rawUserProfile.enabled ?? true,
    data: rawUserProfile.data?.[KIBANA_DATA_ROOT] ?? {},
    user: {
      username: rawUserProfile.user.username,
      // @elastic/elasticsearch types support `null` values for the `email`, but we don't.
      email: rawUserProfile.user.email ?? undefined,
      // @elastic/elasticsearch types support `null` values for the `full_name`, but we don't.
      full_name: rawUserProfile.user.full_name ?? undefined,
    },
  };
}

function parseUserProfileWithSecurity<D extends UserProfileData>(
  rawUserProfile: SecurityUserProfile
): UserProfileWithSecurity<D> {
  const userProfile = parseUserProfile<D>(rawUserProfile);
  return {
    ...userProfile,
    labels: rawUserProfile.labels?.[KIBANA_DATA_ROOT] ?? {},
    user: {
      ...userProfile.user,
      roles: rawUserProfile.user.roles,
      realm_name: rawUserProfile.user.realm_name,
      realm_domain: rawUserProfile.user.realm_domain,
    },
  };
}

export class UserProfileService {
  private authz?: AuthorizationServiceSetupInternal;
  private license?: SecurityLicense;
  constructor(private readonly logger: Logger) {}

  setup({ authz, license }: UserProfileServiceSetupParams) {
    this.authz = authz;
    this.license = license;
  }

  start({ clusterClient, session }: UserProfileServiceStartParams) {
    return {
      activate: this.activate.bind(this, clusterClient),
      getCurrent: this.getCurrent.bind(this, clusterClient, session),
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

        return parseUserProfileWithSecurity<{}>(response);
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
   * See {@link UserProfileServiceStart} for documentation.
   */
  private async getCurrent<D extends UserProfileData>(
    clusterClient: IClusterClient,
    session: PublicMethodsOf<Session>,
    { request, dataPath }: UserProfileGetCurrentParams
  ) {
    let userSession;
    try {
      userSession = await session.get(request);
    } catch (error) {
      this.logger.error(`Failed to retrieve user session: ${getDetailedErrorMessage(error)}`);
      throw error;
    }

    if (userSession.error) {
      return null;
    }

    if (!userSession.value.userProfileId) {
      this.logger.debug(
        `User profile missing from the current session [sid=${getPrintableSessionId(
          userSession.value.sid
        )}].`
      );
      return null;
    }

    let body;
    try {
      body = await clusterClient.asInternalUser.security.getUserProfile({
        uid: userSession.value.userProfileId,
        data: dataPath ? prefixCommaSeparatedValues(dataPath, KIBANA_DATA_ROOT) : undefined,
      });
    } catch (error) {
      this.logger.error(
        `Failed to retrieve user profile for the current user [sid=${getPrintableSessionId(
          userSession.value.sid
        )}]: ${getDetailedErrorMessage(error)}`
      );
      throw error;
    }

    if (body.profiles.length === 0) {
      this.logger.error(
        `The user profile for the current user [sid=${getPrintableSessionId(
          userSession.value.sid
        )}] is not found.`
      );
      throw new Error(`User profile is not found.`);
    }

    return parseUserProfileWithSecurity<D>(body.profiles[0]);
  }

  /**
   * See {@link UserProfileServiceStart} for documentation.
   */
  private async bulkGet<D extends UserProfileData>(
    clusterClient: IClusterClient,
    { uids, dataPath }: UserProfileBulkGetParams
  ): Promise<Array<UserProfile<D>>> {
    if (uids.size === 0) {
      return [];
    }

    try {
      const body = await clusterClient.asInternalUser.security.getUserProfile({
        uid: [...uids].join(','),
        data: dataPath ? prefixCommaSeparatedValues(dataPath, KIBANA_DATA_ROOT) : undefined,
      });

      return body.profiles.map((rawUserProfile) => parseUserProfile<D>(rawUserProfile));
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
   * See {@link UserProfileServiceStart} for documentation.
   */
  private async suggest<D extends UserProfileData>(
    clusterClient: IClusterClient,
    params: UserProfileSuggestParams
  ): Promise<Array<UserProfile<D>>> {
    if (!this.license?.getFeatures().allowUserProfileCollaboration) {
      throw Error("Current license doesn't support user profile collaboration APIs.");
    }

    const { name, hint, size = DEFAULT_SUGGESTIONS_COUNT, dataPath, requiredPrivileges } = params;
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
        hint,
        // If fetching data turns out to be a performance bottleneck, we can try to fetch data
        // only for the profiles that pass privileges check as a separate bulkGet request.
        data: dataPath ? prefixCommaSeparatedValues(dataPath, KIBANA_DATA_ROOT) : undefined,
      });

      const filteredProfiles =
        requiredPrivileges && requiredPrivileges?.privileges.kibana.length > 0
          ? await this.filterProfilesByPrivileges(body.profiles, requiredPrivileges, size)
          : body.profiles;
      return filteredProfiles.map((rawProfile) => parseUserProfile<D>(rawProfile));
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
        // We check privileges in batches and the batch can have more users than requested. We ignore "excessive" users,
        // but still iterate through entire batch to collect and report all unknown uids.
        if (filteredProfile && filteredProfiles.length < requiredSize) {
          filteredProfiles.push(filteredProfile);
        } else if (!filteredProfile) {
          unknownUids.push(profileUid);
        }
      }

      // Log unknown profile UIDs.
      if (unknownUids.length > 0) {
        this.logger.error(`Privileges check API returned unknown profile UIDs: ${unknownUids}.`);
      }

      // Log profile UIDs and reason for which an error was encountered.
      if (response.errors?.count) {
        const uids = Object.keys(response.errors.details);

        for (const uid of uids) {
          this.logger.error(
            `Privileges check API failed for UID ${uid} because ${response.errors.details[uid].reason}.`
          );
        }
      }
    }

    return filteredProfiles;
  }
}

/**
 * Returns string of comma separated values prefixed with `prefix`.
 * @param str String of comma separated values
 * @param prefix Prefix to use prepend to each value
 */
export function prefixCommaSeparatedValues(str: string, prefix: string) {
  return str
    .split(',')
    .reduce<string[]>((accumulator, value) => {
      const trimmedValue = value.trim();
      if (trimmedValue) {
        accumulator.push(`${prefix}.${trimmedValue}`);
      }
      return accumulator;
    }, [])
    .join(',');
}
