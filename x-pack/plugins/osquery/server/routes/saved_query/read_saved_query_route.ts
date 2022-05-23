/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from '@kbn/core/server';
import { find } from 'lodash';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { OSQUERY_INTEGRATION_NAME, PLUGIN_ID } from '../../../common';
import { savedQuerySavedObjectType } from '../../../common/types';
import { convertECSMappingToObject } from '../utils';

export const readSavedQueryRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.get(
    {
      path: '/internal/osquery/saved_query/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
      options: { tags: [`access:${PLUGIN_ID}-readSavedQueries`] },
    },
    async (context, request, response) => {
      const coreContext = await context.core;
      const savedObjectsClient = coreContext.savedObjects.client;

      const savedQuery = await savedObjectsClient.get<{
        ecs_mapping: Array<{ key: string; value: Record<string, object> }>;
        prebuilt?: boolean;
      }>(savedQuerySavedObjectType, request.params.id);

      const installation = await osqueryContext.service
        .getPackageService()
        ?.asInternalUser?.getInstallation(OSQUERY_INTEGRATION_NAME);

      let installationSavedQueries;
      if (installation) {
        installationSavedQueries = find(
          installation.installed_kibana,
          (item) => item.type === savedQuerySavedObjectType && item.id === savedQuery.id
        );
      }

      if (savedQuery.attributes.ecs_mapping) {
        // @ts-expect-error update types
        savedQuery.attributes.ecs_mapping = convertECSMappingToObject(
          savedQuery.attributes.ecs_mapping
        );
      }

      if (installationSavedQueries) {
        savedQuery.attributes.prebuilt = true;
      }

      return response.ok({
        body: savedQuery,
      });
    }
  );
};
