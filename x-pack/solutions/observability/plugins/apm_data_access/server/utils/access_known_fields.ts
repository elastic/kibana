/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { unflattenKnownApmEventFields } from './unflatten_known_fields';
import {
  type UnflattenedKnownFields,
  type FlattenedApmEvent,
  type MapToSingleOrMultiValue,
  KNOWN_SINGLE_VALUED_FIELDS_SET,
  type KnownField,
} from './utility_types';

type RequiredApmFields<
  T extends Partial<FlattenedApmEvent>,
  R extends keyof FlattenedApmEvent = never
> = Partial<T> & Required<Pick<T, R>>;

/**
 * A Proxied APM document that is strongly typed and runtime checked to be correct.
 * Accessing fields from the document will correctly return single or multi values
 * according to known field types.
 */
type ProxiedApmEvent<
  T extends Partial<FlattenedApmEvent>,
  R extends keyof FlattenedApmEvent = never
> = Readonly<MapToSingleOrMultiValue<RequiredApmFields<T, R>>>;

/**
 * Interface for exposing an `unflatten()` method on proxied APM documents.
 */
interface UnflattenApmDocument<
  T extends Partial<FlattenedApmEvent>,
  R extends keyof FlattenedApmEvent = never
> {
  /**
   * Unflattens the APM Event, so fields can be accessed via `event.service?.name`.
   *
   * ```ts
   * const unflattened = accessKnownApmEventFields(hit, ['service.name']).unflatten();
   *
   * console.log(unflattened.service.name); // outputs "node-svc" for example
   * ```
   */
  unflatten(): UnflattenedKnownFields<RequiredApmFields<T, R>>;
}

/**
 * An APM document that is strongly typed and runtime checked to be correct.
 * Accessing fields from the document will correctly return single or multi values
 * according to known field types.
 *
 * An `unflatten()` method is also exposed by this document to return an unflattened
 * version of the document.
 */
type ApmDocument<
  T extends Partial<FlattenedApmEvent>,
  R extends keyof FlattenedApmEvent = never
> = ProxiedApmEvent<T, R> & UnflattenApmDocument<T, R>;

/**
 * Validates an APM Event document, checking if it has all the required fields if provided,
 * returning a proxied version of the document to allow strongly typed access to known single
 * or multi-value fields. The proxy also exposes an `unflatten()` method to return an unflattened
 * version of the document.
 *
 * ## Example
 *
 * ```ts
 * const event = accessKnownApmEventFields(hit, ['service.name']);
 *
 * // The key is strongly typed to be `keyof FlattenedApmEvent`.
 * console.log(event['service.name']) // => outputs `"node-svc"`, not `["node-svc"]` as in the original doc
 *
 * const unflattened = event.unflatten();
 *
 * console.log(unflattened.service.name); // => outputs "node-svc" like above
 */
export function accessKnownApmEventFields<
  T extends Partial<FlattenedApmEvent>,
  R extends keyof FlattenedApmEvent = never
>(fields: T, required?: R[]): ApmDocument<T, R>;

export function accessKnownApmEventFields(fields: Record<string, any>, required?: string[]) {
  if (required) {
    const missingRequiredFields = required.filter((key) => {
      const value = fields[key];

      return value == null || (Array.isArray(value) && value.length === 0);
    });

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

    return KNOWN_SINGLE_VALUED_FIELDS_SET.has(key as KnownField) && Array.isArray(value)
      ? value[0]
      : value;
  },

  // Trap any setters to make the proxied object immutable.
  set() {
    return false;
  },
};
