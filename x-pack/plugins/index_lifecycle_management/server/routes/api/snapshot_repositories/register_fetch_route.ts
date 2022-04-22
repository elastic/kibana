/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { MIN_SEARCHABLE_SNAPSHOT_LICENSE } from '../../../../common/constants';
import { ListSnapshotReposResponse } from '../../../../common/types';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '../../../services';
import { handleEsError } from '../../../shared_imports';

export const registerFetchRoute = ({ router, license }: RouteDependencies) => {
  router.get(
    { path: addBasePath('/snapshot_repositories'), validate: false },
    async (ctx, request, response) => {
      if (!license.isCurrentLicenseAtLeast(MIN_SEARCHABLE_SNAPSHOT_LICENSE)) {
        return response.forbidden({
          body: i18n.translate('xpack.indexLifecycleMgmt.searchSnapshotlicenseCheckErrorMessage', {
            defaultMessage:
              'Use of searchable snapshots requires at least an enterprise level license.',
          }),
        });
      }

      try {
        const esClient = (await ctx.core).elasticsearch.client;
        const esResult = await esClient.asCurrentUser.snapshot.getRepository({
          name: '*',
        });
        const repos: ListSnapshotReposResponse = {
          repositories: Object.keys(esResult),
        };
        return response.ok({ body: repos });
      } catch (e) {
        // If ES responds with 404 when looking up all snapshots we return an empty array
        if (e?.statusCode === 404) {
          const repos: ListSnapshotReposResponse = {
            repositories: [],
          };
          return response.ok({ body: repos });
        }
        return handleEsError({ error: e, response });
      }
    }
  );
};
