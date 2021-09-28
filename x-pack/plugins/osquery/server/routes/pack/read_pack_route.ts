/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, has, map } from 'lodash';
import { schema } from '@kbn/config-schema';
import { PLUGIN_ID } from '../../../common';

import { OSQUERY_INTEGRATION_NAME } from '../../../common';
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
      options: { tags: [`access:${PLUGIN_ID}-readPacks`] },
    },
    async (context, request, response) => {
      const savedObjectsClient = context.core.savedObjects.client;
      const packagePolicyService = osqueryContext.service.getPackagePolicyService();

      const packagePolicies = await packagePolicyService?.list(savedObjectsClient, {
        kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${OSQUERY_INTEGRATION_NAME}`,
        perPage: 1000,
        page: 1,
      });

      const { attributes, references, ...rest } = await savedObjectsClient.get<{
        name: string;
        description: string;
        queries: Array<{ name: string; interval: string }>;
      }>(
        packSavedObjectType,
        // @ts-expect-error update types
        request.params.id
      );

      const policyIds = map(
        filter(packagePolicies?.items, (packagePolicy) =>
          has(packagePolicy, `inputs[0].config.osquery.value.packs.${attributes.name}`)
        ),
        'policy_id'
      );

      return response.ok({
        body: {
          ...rest,
          ...attributes,
          policy_ids: policyIds,
          references,
        },
      });
    }
  );
};
