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
  ensureRequiredApmFields,
} from './utility_types';

/**
 * WeakMap storing all proxied methods for `ApmDocument`. As long as the proxy
 * object lives, the methods will be available. All the methods here are lazily
 * evaluated/initialised so the user only "pays the cost" of the methods they use.
 */
const PROXIED_METHODS: WeakMap<
  Record<string, any>,
  {
    build?: () => Record<string, any>;
    requireFields?: (required: string[]) => Record<string, any>;
    containsFields?: (field: string) => boolean;
    unflatten?: () => Record<string, any>;
  }
> = new WeakMap();

type RequiredApmFields<
  T extends Partial<FlattenedApmEvent>,
  R extends keyof FlattenedApmEvent = never
> = Partial<T> & Required<Pick<T, R>>;

/**
 * A Proxied APM document that is strongly typed and runtime checked to be correct.
 * Accessing fields from the document will correctly return single or multi values
 * according to known field types.
 */
export type ProxiedApmEvent<
  T extends Partial<FlattenedApmEvent>,
  R extends keyof FlattenedApmEvent = never
> = Readonly<MapToSingleOrMultiValue<RequiredApmFields<T, R>>>;

/**
 * Interface for exposing the `unflatten()` and `requireFields()` methods on proxied APM documents.
 */
interface ApmDocumentMethods<
  T extends Partial<FlattenedApmEvent>,
  R extends keyof FlattenedApmEvent = never
> {
  /**
   * Creates a new unproxied object with all the fields values extracted into their single or
   * multi-value form. The new object no longer grants access to proxied methods.
   */
  build(): MapToSingleOrMultiValue<RequiredApmFields<T, R>>;
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
  /**
   * Evaluates the APM Event with a set of required fields, throwing an error if
   * the event is invalid, or returning the document if valid, but now type-checked to
   * include the provided required fields.
   */
  requireFields<K extends keyof FlattenedApmEvent = never>(fields: K[]): ApmDocument<T, R | K>;
  /**
   * Evaluates whether any field matches the input string partially or fully and if those that
   * do match have a value present.
   */
  containsFields(fields: string): boolean;
}

/**
 * An APM document that is strongly typed and runtime checked to be correct.
 * Accessing fields from the document will correctly return single or multi values
 * according to known field types.
 *
 * An `unflatten()` method is also exposed by this document to return an unflattened
 * version of the document.
 */
export type ApmDocument<
  T extends Partial<FlattenedApmEvent>,
  R extends keyof FlattenedApmEvent = never
> = ProxiedApmEvent<T, R> & ApmDocumentMethods<T, R>;

/**
 * Validates an APM Event document, checking if it has all the required fields if provided,
 * returning a proxied version of the document to allow strongly typed access to known single
 * or multi-value fields. The proxy also exposes an `unflatten()` method to return an unflattened
 * version of the document.
 *
 * ## Example
 *
 * ```ts
 * const event = accessKnownApmEventFields(hit).requireFields(['service.name']);
 *
 * // The key is strongly typed to be `keyof FlattenedApmEvent`.
 * console.log(event['service.name']) // => outputs `"node-svc"`, not `["node-svc"]` as in the original doc
 *
 * const unflattened = event.unflatten();
 *
 * console.log(unflattened.service.name); // => outputs "node-svc" like above
 */
export function accessKnownApmEventFields<T extends Partial<FlattenedApmEvent>>(
  fields: T
): ApmDocument<T, never>;

export function accessKnownApmEventFields(fields: Record<string, any>) {
  const proxy = new Proxy(fields, accessHandler);

  // Methods are lazily initialised so you only pay the "cost" of what you use.
  PROXIED_METHODS.set(proxy, {});

  return proxy;
}

const accessHandler = {
  get(fields: Record<string, any>, key: string, proxy: any) {
    switch (key) {
      case 'build':
        return (PROXIED_METHODS.get(proxy)!.build ??= () => ({ ...proxy }));

      case 'unflatten':
        // Lazily initialise method on first access
        return (PROXIED_METHODS.get(proxy)!.unflatten ??= () =>
          unflattenKnownApmEventFields(fields));

      case 'requireFields':
        // Lazily initialise method on first access
        return (PROXIED_METHODS.get(proxy)!.requireFields ??= (requiredFields: string[]) => {
          ensureRequiredApmFields(fields, requiredFields);

          return proxy;
        });

      case 'containsFields':
        return (PROXIED_METHODS.get(proxy)!.containsFields ??= (field: string) => {
          return Object.keys(fields).some(
            (originalField) =>
              originalField.includes(field) && Boolean(fields[originalField]?.length)
          );
        });

      default: {
        const value = fields[key];

        return KNOWN_SINGLE_VALUED_FIELDS_SET.has(key as KnownField) && Array.isArray(value)
          ? value[0]
          : value;
      }
    }
  },

  // Trap any setters to make the proxied object immutable.
  set() {
    return false;
  },

  ownKeys(target: any) {
    return Object.keys(target);
  },
};
