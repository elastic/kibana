/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SERVICE_NAME, AGENT_NAME, SERVICE_ENVIRONMENT } from '@kbn/apm-types';
import { BUILT_IN_ENTITY_TYPES, DATA_STREAM_TYPE } from '@kbn/observability-shared-plugin/common';
import moment from 'moment';
import type { EntityClient } from '@kbn/entityManager-plugin/server/lib/entity_client';
import { withApmSpan } from '../../../utils/with_apm_span';
import { mergeEntities } from '../utils/merge_entities';

interface Params {
  entityManagerClient: EntityClient;
  serviceName: string;
  environment: string;
}

export function getServiceEntitySummary({ entityManagerClient, environment, serviceName }: Params) {
  return withApmSpan('get_service_entity_summary', async () => {
    const serviceEntitySummary = await entityManagerClient.v2.searchEntities({
      start: moment().subtract(15, 'm').toISOString(),
      end: moment().toISOString(),
      type: BUILT_IN_ENTITY_TYPES.SERVICE_V2,
      filters: [`${SERVICE_NAME}: "${serviceName}"`],
      limit: 1,
      metadata_fields: [DATA_STREAM_TYPE, AGENT_NAME, SERVICE_ENVIRONMENT],
    });

    const serviceEntity = mergeEntities({ entities: serviceEntitySummary?.entities });
    return serviceEntity[0];
  });
}
