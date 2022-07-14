/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { Subject } from 'rxjs';

import type { HttpStart } from '@kbn/core/public';

import type { GetUserProfileResponse, UserProfileData } from '../../../common';

const USER_PROFILE_URL = '/internal/security/user_profile';

export class UserProfileAPIClient {
  private readonly internalDataUpdates$: Subject<UserProfileData> = new Subject();

  /**
   * Emits event whenever user profile is changed by the user.
   */
  public readonly dataUpdates$: Observable<UserProfileData> =
    this.internalDataUpdates$.asObservable();

  constructor(private readonly http: HttpStart) {}

  /**
   * Retrieves the user profile of the current user.
   * @param dataPath By default `get()` returns user information, but does not return any user data. The optional "dataPath" parameter can be used to return personal data for this user.
   */
  public get<D extends UserProfileData>(dataPath?: string) {
    return this.http.get<GetUserProfileResponse<D>>(USER_PROFILE_URL, {
      query: { data: dataPath },
    });
  }

  /**
   * Updates user profile data of the current user.
   * @param data Application data to be written (merged with existing data).
   */
  public update<D extends UserProfileData>(data: D) {
    return this.http.post(`${USER_PROFILE_URL}/_data`, { body: JSON.stringify(data) }).then(() => {
      this.internalDataUpdates$.next(data);
    });
  }
}
