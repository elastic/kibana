/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, find, map, compact } from 'lodash';
import { schema } from '@kbn/config-schema';

import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../../../fleet/common';
import { IRouter } from '../../../../../../src/core/server';
import { packSavedObjectType } from '../../../common/types';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';

export const readPackRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.get(
    {
      path: '/internal/osquery/packs/{id}',
      validate: {
        params: schema.object({}, { unknowns: 'allow' }),
      },
    },
    async (context, request, response) => {
      const savedObjectsClient = context.core.savedObjects.client;
      const packagePolicyService = osqueryContext.service.getPackagePolicyService();

      const { attributes, references, ...rest } = await savedObjectsClient.get<{
        name: string;
        description: string;
        queries: Array<{ name: string; interval: string }>;
      }>(
        packSavedObjectType,
        // @ts-expect-error update types
        request.params.id
      );

      const packagePolicyReferences = filter(references, [
        'type',
        PACKAGE_POLICY_SAVED_OBJECT_TYPE,
      ]);

      const packagePolicies = await packagePolicyService?.getByIDs(
        savedObjectsClient,
        map(packagePolicyReferences, 'id')
      );

      return response.ok({
        body: {
          ...rest,
          ...attributes,
          packagePolicies,
          agent_policy_ids: packagePolicies ? compact(map(packagePolicies, 'policy_id')) : [],
          references,
        },
      });
    }
  );
};
