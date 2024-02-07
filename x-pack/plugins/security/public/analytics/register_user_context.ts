/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { catchError, from, map, of } from 'rxjs';

import type { AnalyticsServiceSetup } from '@kbn/core/public';
import { Sha256 } from '@kbn/crypto-browser';
import type { AuthenticationServiceSetup } from '@kbn/security-plugin-types-public';

interface UserIdContext {
  userId?: string;
  isElasticCloudUser: boolean;
}

/**
 * Set up the Analytics context provider for the User information.
 * @param analytics Core's Analytics service. The Setup contract.
 * @param authc {@link AuthenticationServiceSetup} used to get the current user's information
 * @param cloudId The Cloud Org ID.
 * @private
 */
export function registerUserContext(
  analytics: AnalyticsServiceSetup,
  authc: AuthenticationServiceSetup,
  cloudId?: string
) {
  analytics.registerContextProvider<UserIdContext>({
    name: 'user_id',
    context$: from(authc.getCurrentUser()).pipe(
      map((user) => {
        if (user.elastic_cloud_user) {
          // If the user is managed by ESS, use the plain username as the user ID:
          // The username is expected to be unique for these users,
          // and it matches how users are identified in the Cloud UI, so it allows us to correlate them.
          return { userId: user.username, isElasticCloudUser: true };
        }

        return {
          // For the rest of the authentication providers, we want to add the cloud deployment ID to make it unique.
          // Especially in the case of Elasticsearch-backed authentication, where users are commonly repeated
          // across multiple deployments (i.e.: `elastic` superuser).
          userId: cloudId ? `${cloudId}:${user.username}` : user.username,
          isElasticCloudUser: false,
        };
      }),
      // The hashing here is to keep it at clear as possible in our source code that we do not send literal user IDs
      map(({ userId, isElasticCloudUser }) => ({ userId: sha256(userId), isElasticCloudUser })),
      catchError(() => of({ userId: undefined, isElasticCloudUser: false }))
    ),
    schema: {
      userId: {
        type: 'keyword',
        _meta: { description: 'The user id scoped as seen by Cloud (hashed)', optional: true },
      },
      isElasticCloudUser: {
        type: 'boolean',
        _meta: {
          description: '`true` if the user is managed by ESS.',
        },
      },
    },
  });
}

function sha256(str: string) {
  return new Sha256().update(str, 'utf8').digest('hex');
}
