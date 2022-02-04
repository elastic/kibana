/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from 'src/core/server';

const KIBANA_DATA_ROOT = 'kibana';

export interface Profile<T extends UserData> {
  uid: string;
  user: User;
  data: T;
}

export interface User {
  username: string;
  roles: string[];
  realm_name: string;
  full_name: string;
  display_name?: string;
  avatar?: {
    initials?: string;
    color?: string;
    image_url?: string;
  };
  active: boolean;
}

export type UserData = Record<string, unknown>;

export interface ProfileServiceStart {
  /**
   * Creates or updates an existing user profile.
   */
  // activate(params: { username: string; password: string }): Promise<void>;

  /**
   * Retrieves a single user profile by identifier.
   * @param uid User ID
   * @param dataPath By default `get()` returns user information, but does not return any user data. The optional "dataPath" parameter can be used to return personal data for this user.
   */
  get<T extends UserData>(uid: string, dataPath?: string): Promise<Profile<T>>;

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
    user: User;
    data: {
      [KIBANA_DATA_ROOT]: T;
    };
    access: {};
    enabled: boolean;
    last_synchronized: number;
  }
>;

export class ProfileService {
  constructor(private readonly logger: Logger) {}

  start(elasticsearchClient: ElasticsearchClient): ProfileServiceStart {
    const { logger } = this;
    logger.info('ProfileService: start');

    async function get<T extends UserData>(uid: string, dataPath?: string) {
      const { body } = await elasticsearchClient.transport.request<GetProfileResponse<T>>({
        method: 'GET',
        path: `_security/profile/${uid}${dataPath ? `?data=${KIBANA_DATA_ROOT}.${dataPath}` : ''}`,
      });
      logger.info('ProfileService: get', body);

      const { user, data } = body[uid];

      return { uid, user, data: data[KIBANA_DATA_ROOT] };
    }

    async function update<T extends UserData>(uid: string, data: T) {
      logger.info('ProfileService: update', data);
      await elasticsearchClient.transport.request({
        method: 'POST',
        path: `_security/profile/_data/${uid}`,
        body: {
          data: {
            [KIBANA_DATA_ROOT]: data,
          },
        },
      });
    }

    return { get, update };
  }
}
