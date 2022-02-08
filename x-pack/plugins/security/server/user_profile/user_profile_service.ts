/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from 'src/core/server';

import type { User } from '../../common';

const KIBANA_DATA_ROOT = 'kibana';

export interface UserProfile<T extends UserData> {
  uid: string;
  user: UserInfo;
  data: T;
}

export interface UserInfo extends User {
  display_name?: string;
  avatar?: {
    initials?: string;
    color?: string;
    image_url?: string;
  };
  active: boolean;
}

export type UserData = Record<string, unknown>;

export interface UserProfileServiceStart {
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
  }
>;

export class UserProfileService {
  constructor(private readonly logger: Logger) {}

  start(elasticsearchClient: ElasticsearchClient): UserProfileServiceStart {
    const { logger } = this;

    async function get<T extends UserData>(uid: string, dataPath?: string) {
      try {
        const { body } = await elasticsearchClient.transport.request<GetProfileResponse<T>>({
          method: 'GET',
          path: `_security/profile/${uid}${
            dataPath ? `?data=${KIBANA_DATA_ROOT}.${dataPath}` : ''
          }`,
        });
        const { user, data } = body[uid];
        return { uid, user, data: data[KIBANA_DATA_ROOT] };
      } catch (error) {
        logger.error(`Failed to retrieve user profile [uid=${uid}]: ${error.message}`);
        throw error;
      }
    }

    async function update<T extends UserData>(uid: string, data: T) {
      try {
        await elasticsearchClient.transport.request({
          method: 'POST',
          path: `_security/profile/_data/${uid}`,
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

    return { get, update };
  }
}
