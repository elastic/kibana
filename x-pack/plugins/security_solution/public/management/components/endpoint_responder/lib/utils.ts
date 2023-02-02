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

const convertToMilliseconds = (value: number, unit: 'h' | 'm' | 's'): number => {
  const unitToMilliseconds = {
    h: (): number => value * 60 * 60 * 1000,
    m: (): number => value * 60 * 1000,
    s: (): number => value * 1000,
  };

  return unitToMilliseconds[unit]();
};

export const EXECUTE_TIMEOUT_REGEX = /^\d+(?=(h|m|s){1}$)/;
export const parsedTimeoutInMilliseconds = (timeout?: string): number => {
  const timeoutMatch = timeout?.trim().match(EXECUTE_TIMEOUT_REGEX);
  if (!timeoutMatch) {
    return convertToMilliseconds(2, 'h');
  }

  return convertToMilliseconds(Number(timeoutMatch[0]), timeoutMatch[1] as 'h' | 'm' | 's');
};
