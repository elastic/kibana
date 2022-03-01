/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TelemetryEvent } from './types';

export interface AllowlistFields {
  [key: string]: boolean | AllowlistFields;
}

export const savedQueryEventFields: AllowlistFields = {
  id: true,
  query: true,
  created_at: true,
  updated_at: true,
  platform: true,
  version: true,
  interval: true,
  ecs_mapping: true,
};

export const packEventFields: AllowlistFields = {
  id: true,
  name: true,
  created_at: true,
  updated_at: true,
  enabled: true,
  queries: true,
};

/**
 * Filters out information not required for downstream analysis
 *
 * @param allowlist
 * @param event
 * @returns TelemetryEvent with explicitly required fields
 */
export function copyAllowlistedFields(
  allowlist: AllowlistFields,
  event: TelemetryEvent
): TelemetryEvent {
  return Object.entries(allowlist).reduce<TelemetryEvent>((newEvent, [allowKey, allowValue]) => {
    const eventValue = event[allowKey];
    if (eventValue !== null && eventValue !== undefined) {
      if (allowValue === true) {
        return { ...newEvent, [allowKey]: eventValue };
      } else if (typeof allowValue === 'object' && Array.isArray(eventValue)) {
        const subValues = eventValue.filter((v) => typeof v === 'object');
        return {
          ...newEvent,
          [allowKey]: subValues.map((v) => copyAllowlistedFields(allowValue, v as TelemetryEvent)),
        };
      } else if (typeof allowValue === 'object' && typeof eventValue === 'object') {
        const values = copyAllowlistedFields(allowValue, eventValue as TelemetryEvent);
        return {
          ...newEvent,
          ...(Object.keys(values).length > 0 ? { [allowKey]: values } : {}),
        };
      }
    }
    return newEvent;
  }, {});
}
