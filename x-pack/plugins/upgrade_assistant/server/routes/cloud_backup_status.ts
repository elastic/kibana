/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_BASE_PATH } from '../../common/constants';
import { versionCheckHandlerWrapper } from '../lib/es_version_precheck';
import { RouteDependencies } from '../types';

export function registerCloudBackupStatusRoutes({
  router,
  lib: { handleEsError },
}: RouteDependencies) {
  // GET most recent Cloud snapshot
  router.get(
    { path: `${API_BASE_PATH}/cloud_backup_status`, validate: false },
    versionCheckHandlerWrapper(async (context, request, response) => {
      const { client: clusterClient } = context.core.elasticsearch;

      try {
        const {
          body: { snapshots },
        } = await clusterClient.asCurrentUser.snapshot.get({
          repository: 'found-snapshots',
          snapshot: '_all',
          ignore_unavailable: true, // Allow request to succeed even if some snapshots are unavailable.
          // @ts-expect-error @elastic/elasticsearch "desc" is a new param
          order: 'desc',
          sort: 'start_time',
          size: 1,
        });

        let isBackedUp = false;
        let time;

        if (snapshots && snapshots[0]) {
          time = snapshots![0].start_time;
          isBackedUp = true;
        }

        return response.ok({
          body: {
            isBackedUp,
            time,
          },
        });
      } catch (error) {
        return handleEsError({ error, response });
      }
    })
  );
}
