/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDataStreamType } from '../../common/entities/types';

export function isApmSignal(dataStreamTypes: EntityDataStreamType[]) {
  return (
    dataStreamTypes.includes(EntityDataStreamType.METRICS) ||
    dataStreamTypes.includes(EntityDataStreamType.TRACES)
  );
}
export function isLogsSignal(dataStreamTypes: EntityDataStreamType[]) {
  return dataStreamTypes.includes(EntityDataStreamType.LOGS);
}
