/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
// @ts-ignore
import { handleError } from '../../../../../lib/errors';
import { RouteDependencies } from '../../../../../types';
import { getAlertTypes } from '../../../../../lib/kibana/task_manager';
// @ts-ignore
import { prefixIndexPattern } from '../../../../../lib/ccs_utils';
import { INDEX_PATTERN_KIBANA } from '../../../../../../common/constants';

export function alertTypesRoute(server: any, npRoute: RouteDependencies) {
  npRoute.router.post(
    {
      path:
        '/api/monitoring/v1/clusters/{clusterUuid}/kibana/{kibanaUuid}/task_manager/alert_types',
      validate: {
        params: schema.object({
          clusterUuid: schema.string(),
          kibanaUuid: schema.string(),
        }),
        body: schema.object({
          ccs: schema.maybe(schema.string()),
          timeRange: schema.object({
            min: schema.string(),
            max: schema.string(),
          }),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const config = server.config();
        const kbnIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_KIBANA, request.body.ccs);
        const alertTypes = await getAlertTypes(
          npRoute.cluster.asScoped(request).callAsCurrentUser,
          kbnIndexPattern,
          { clusterUuid: request.params.clusterUuid, kibanaUuid: request.params.kibanaUuid }
        );
        return response.ok({ body: { alertTypes } });
      } catch (err) {
        throw handleError(err);
      }
    }
  );
}
