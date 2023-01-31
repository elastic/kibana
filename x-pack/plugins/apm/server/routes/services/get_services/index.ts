/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { ApmDocumentType } from '../../../../common/document_type';
import { RollupInterval } from '../../../../common/rollup';
import { ServiceGroup } from '../../../../common/service_groups';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { ApmAlertsClient } from '../../../lib/helpers/get_apm_alerts_client';
import { MlClient } from '../../../lib/helpers/get_ml_client';
import { RandomSampler } from '../../../lib/helpers/get_random_sampler';
import { getServicesItems } from './get_services_items';

export async function getServices({
  environment,
  kuery,
  mlClient,
  apmEventClient,
  apmAlertsClient,
  logger,
  start,
  end,
  serviceGroup,
  randomSampler,
  documentType,
  rollupInterval,
}: {
  environment: string;
  kuery: string;
  mlClient?: MlClient;
  apmEventClient: APMEventClient;
  apmAlertsClient: ApmAlertsClient;
  logger: Logger;
  start: number;
  end: number;
  serviceGroup: ServiceGroup | null;
  randomSampler: RandomSampler;
  documentType: ApmDocumentType;
  rollupInterval: RollupInterval;
}) {
  const items = await getServicesItems({
    environment,
    kuery,
    mlClient,
    apmEventClient,
    apmAlertsClient,
    logger,
    start,
    end,
    serviceGroup,
    randomSampler,
    documentType,
    rollupInterval,
  });

  return {
    items,
  };
}
