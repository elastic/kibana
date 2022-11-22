/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ResponseActionParametersWithPidOrEntityId } from '../../../../../common/endpoint/types';

export const parsedPidOrEntityIdParameter = (parameters: {
  pid?: string[];
  entityId?: string[];
}): ResponseActionParametersWithPidOrEntityId => {
  if (parameters.pid) {
    return { pid: Number(parameters.pid[0]) };
  }

  return {
    entity_id: parameters?.entityId?.[0] ?? '',
  };
};
