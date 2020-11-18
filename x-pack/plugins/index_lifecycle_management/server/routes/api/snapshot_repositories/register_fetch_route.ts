/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import { ListSnapshotReposResponse } from '../../../../common/types';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '../../../services';
import { handleEsError } from '../../../shared_imports';

export const registerFetchRoute = ({ router, license }: RouteDependencies) => {
  router.get(
    { path: addBasePath('/snapshot_repositories'), validate: false },
    async (ctx, request, response) => {
      // TODO: change to enterprise
      if (!license.isCurrentLicenseAtLeast('platinum')) {
        return response.forbidden({
          body: i18n.translate('xpack.indexLifecycleMgmt.searchSnapshotlicenseCheckErrorMessage', {
            defaultMessage:
              'Use of searchable snapshots requires at least an enterprise level license.',
          }),
        });
      }

      try {
        const esResult = await ctx.core.elasticsearch.client.asCurrentUser.snapshot.getRepository({
          repository: '*',
        });
        const repos: ListSnapshotReposResponse = {
          repositories: Object.keys(esResult.body),
        };
        return response.ok({ body: repos });
      } catch (e) {
        return handleEsError({ error: e, response });
      }
    }
  );
};
