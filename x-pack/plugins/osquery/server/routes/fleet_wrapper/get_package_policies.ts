/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { PLUGIN_ID, OSQUERY_INTEGRATION_NAME } from '../../../common';
import { IRouter } from '../../../../../../src/core/server';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../../../fleet/common';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { getInternalSavedObjectsClient } from '../../usage/collector';

export const getPackagePoliciesRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.get(
    {
      path: '/internal/osquery/fleet_wrapper/package_policies',
      validate: {
        query: schema.object({}, { unknowns: 'allow' }),
      },
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    async (context, request, response) => {
      const internalSavedObjectsClient = await getInternalSavedObjectsClient(
        osqueryContext.getStartServices
      );
      const kuery = `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.attributes.package.name: ${OSQUERY_INTEGRATION_NAME}`;
      const packagePolicyService = osqueryContext.service.getPackagePolicyService();
      const policies = await packagePolicyService?.list(internalSavedObjectsClient, {
        kuery,
      });

      return response.ok({
        body: policies,
      });
    }
  );
};
