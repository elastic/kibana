/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { SERVICE_NAME } from '../../../../common/es_fields/apm';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { Environment } from '../../../../common/environment_rt';

export async function getServiceNamesFromTermsEnum({
  apmEventClient,
  environment,
  maxNumberOfServices,
  start,
  end,
}: {
  apmEventClient: APMEventClient;
  environment: Environment;
  maxNumberOfServices: number;
  start: number;
  end: number;
}) {
  if (environment !== ENVIRONMENT_ALL.value) {
    return [];
  }
  const response = await apmEventClient.termsEnum('get_services_from_terms_enum', {
    apm: {
      events: [
        ProcessorEvent.transaction,
        ProcessorEvent.span,
        ProcessorEvent.metric,
        ProcessorEvent.error,
      ],
    },
    size: maxNumberOfServices,
    field: SERVICE_NAME,
    index_filter: {
      range: {
        ['@timestamp']: {
          gte: start,
          lte: end,
          format: 'epoch_millis',
        },
      },
    },
  });

  return response.terms;
}
