/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@elastic/datemath';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { getErrorGroupMainStatistics } from '../../../routes/errors/get_error_groups/get_error_group_main_statistics';
import { getDownstreamServiceResource } from './get_downstream_service_resource';

export async function getApmErrors(params: {
  apmEventClient: APMEventClient;
  start: string;
  end: string;
  serviceName: string;
  serviceEnvironment?: string;
}) {
  const { apmEventClient, serviceName, serviceEnvironment } = params;

  const start = datemath.parse(params.start)?.valueOf()!;
  const end = datemath.parse(params.end)?.valueOf()!;

  const res = await getErrorGroupMainStatistics({
    serviceName,
    apmEventClient,
    environment: serviceEnvironment,
    start,
    end,
    maxNumberOfErrorGroups: 100,
  });

  const promises = res.errorGroups.map(async (errorGroup) => {
    if (!errorGroup.traceId) {
      return { ...errorGroup, downstreamServiceResource: undefined };
    }

    const downstreamServiceResource = await getDownstreamServiceResource({
      traceId: errorGroup.traceId,
      start,
      end,
      apmEventClient,
    });

    return { ...errorGroup, downstreamServiceResource };
  });

  return Promise.all(promises);
}
