/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { unflattenKnownApmEventFields } from './unflatten_known_fields';
import {
  KNOWN_SINGLE_VALUED_FIELDS,
  type UnflattenedKnownFields,
  type FlattenedApmEvent,
  type MapToSingleOrMultiValue,
} from './utility_types';

type RequiredApmFields<
  T extends Partial<FlattenedApmEvent>,
  R extends keyof FlattenedApmEvent
> = Partial<T> & Required<Pick<T, R>>;

const KNOWN_SINGLE_VALUED_FIELDS_SET = new Set<string>(KNOWN_SINGLE_VALUED_FIELDS);

export interface Unflatten<T extends Partial<FlattenedApmEvent>> {
  /**
   * Unflattens the APM Event, so fields can be accessed via `event.service?.name`.
   *
   * ```ts
   * const unflattened = accessKnownApmEventFields(hit, ['service.name']).unflatten();
   *
   * console.log(unflattened.service.name); // outputs "node-svc" for example
   * ```
   */
  unflatten(): UnflattenedKnownFields<T>;
}

export function accessKnownApmEventFields<
  T extends Partial<FlattenedApmEvent>,
  R extends keyof FlattenedApmEvent
>(fields: T, required?: R[]): Unflatten<T> & MapToSingleOrMultiValue<RequiredApmFields<T, R>>;

export function accessKnownApmEventFields(fields: Record<string, any>, required?: string[]) {
  if (required) {
    const missingRequiredFields = required.filter((key) => fields[key] == null);

    if (missingRequiredFields.length) {
      throw new Error(`Missing required fields (${missingRequiredFields.join(', ')}) in event`);
    }
  }

  return new Proxy(fields, accessHandler);
}

const accessHandler = {
  get(fields: Record<string, any>, key: string) {
    if (key === 'unflatten') {
      return () => unflattenKnownApmEventFields(fields);
    }

    const value = fields[key];

    return KNOWN_SINGLE_VALUED_FIELDS_SET.has(key) && Array.isArray(value) ? value[0] : value;
  },
};
