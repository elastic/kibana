/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntitiesESClient } from '../../lib/helpers/create_es_client/create_assets_es_client/create_assets_es_clients';
import { withApmSpan } from '../../utils/with_apm_span';
import { getServiceLatestEntity } from './get_service_latest_entity';
import { ServiceEntities } from './types';

interface Params {
  entitiesESClient: EntitiesESClient;
  serviceName: string;
  environment: string;
  start: number;
  end: number;
}

export function getServiceEntitySummary({
  end,
  entitiesESClient,
  environment,
  serviceName,
  start,
}: Params): Promise<ServiceEntities | undefined> {
  return withApmSpan('get_service_entity_summary', () => {
    return getServiceLatestEntity({
      end,
      entitiesESClient,
      environment,
      size: 1,
      start,
      serviceName,
    });
  });
}
