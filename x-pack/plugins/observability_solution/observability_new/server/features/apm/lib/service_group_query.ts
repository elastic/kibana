/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ServiceGroup } from '../../../../common/features/apm/service_groups';
import { kqlQuery } from '../../alerts_and_slos/utils/queries';

export function serviceGroupQuery(serviceGroup?: ServiceGroup | null): QueryDslQueryContainer[] {
  return serviceGroup ? kqlQuery(serviceGroup?.kuery) : [];
}
