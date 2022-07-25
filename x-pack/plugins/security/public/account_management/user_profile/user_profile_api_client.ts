/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { Subject } from 'rxjs';

import type { HttpStart } from '@kbn/core/public';

import type { GetUserProfileResponse, UserProfile, UserProfileData } from '../../../common';

/**
 * Parameters for the get user profile for the current user API.
 */
export interface UserProfileGetCurrentParams {
  /**
   * By default, get API returns user information, but does not return any user data. The optional "dataPath"
   * parameter can be used to return personal data for this user (within `kibana` namespace only).
   */
  dataPath: string;
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

export class UserProfileAPIClient {
  private readonly internalDataUpdates$: Subject<UserProfileData> = new Subject();

  /**
   * Emits event whenever user profile is changed by the user.
   */
  public readonly dataUpdates$: Observable<UserProfileData> =
    this.internalDataUpdates$.asObservable();

  constructor(private readonly http: HttpStart) {}

  /**
   * Retrieves the user profile of the current user. If the profile isn't available, e.g. for the anonymous users or
   * users authenticated via authenticating proxies, the `null` value is returned.
   * @param [params] Get current user profile operation parameters.
   * @param params.dataPath By default `getCurrent()` returns user information, but does not return any user data. The
   * optional "dataPath" parameter can be used to return personal data for this user.
   */
  public getCurrent<D extends UserProfileData>(params?: UserProfileGetCurrentParams) {
    return this.http.get<GetUserProfileResponse<D>>('/internal/security/user_profile', {
      query: { dataPath: params?.dataPath },
    });
  }

  /**
   * Retrieves multiple user profiles by their identifiers.
   * @param params Bulk get operation parameters.
   * @param params.uids List of user profile identifiers.
   * @param params.dataPath By default Elasticsearch returns user information, but does not return any user data. The
   * optional "dataPath" parameter can be used to return personal data for the requested user profiles.
   */
  public bulkGet<D extends UserProfileData>(params: UserProfileBulkGetParams) {
    return this.http.post<Array<UserProfile<D>>>('/internal/security/user_profile/_bulk_get', {
      body: JSON.stringify(params),
    });
  }

  /**
   * Updates user profile data of the current user.
   * @param data Application data to be written (merged with existing data).
   */
  public update<D extends UserProfileData>(data: D) {
    return this.http
      .post('/internal/security/user_profile/_data', { body: JSON.stringify(data) })
      .then(() => {
        this.internalDataUpdates$.next(data);
      });
  }
}
