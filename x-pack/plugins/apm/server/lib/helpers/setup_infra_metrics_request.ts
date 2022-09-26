/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APMRouteHandlerResources } from '../../routes/typings';
import { withApmSpan } from '../../utils/with_apm_span';
import {
  createInfraMetricsClient,
  InfraClient,
} from './create_es_client/create_infra_metrics_client/create_infra_metrics_client';

// Explicitly type Setup to prevent TS initialization errors
// https://github.com/microsoft/TypeScript/issues/34933

export interface SetupInfraMetrics {
  infraMetricsClient: InfraClient;
}

export async function setupInfraMetricsRequest({
  context,
  plugins,
}: APMRouteHandlerResources): Promise<SetupInfraMetrics> {
  return withApmSpan('setup_infra_metrics_request', async () => {
    return {
      infraMetricsClient: await createInfraMetricsClient({
        infraPlugin: plugins.infra,
        context,
      }),
    };
  });
}
