/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDataStreamType } from '@kbn/observability-shared-plugin/common';

export function hasMetrics(dataStreamTypes: EntityDataStreamType[] | undefined) {
  return dataStreamTypes?.includes(EntityDataStreamType.METRICS);
}
