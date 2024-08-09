/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import { API_VERSIONS } from '../../../common/constants';
import { PLUGIN_ID, OSQUERY_INTEGRATION_NAME } from '../../../common';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { getInternalSavedObjectsClient } from '../utils';

export const getPackagePoliciesRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.versioned
    .get({
      access: 'internal',
      path: '/internal/osquery/fleet_wrapper/package_policies',
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {},
      },
      async (context, request, response) => {
        const internalSavedObjectsClient = await getInternalSavedObjectsClient(
          osqueryContext.getStartServices
        );
        const kuery = `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.attributes.package.name: ${OSQUERY_INTEGRATION_NAME}`;
        const packagePolicyService = osqueryContext.service.getPackagePolicyService();
        const policies = await packagePolicyService?.list(internalSavedObjectsClient, {
          kuery,
          perPage: 1000,
        });

        return response.ok({
          body: policies,
        });
      }
    );
};
