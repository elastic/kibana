/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
type Validator<T> = (value: unknown) => value is T;
type TypeOf<V extends Validator<unknown>> = V extends Validator<infer T> ? T : never;

/**
 * Validate that `value` matches at least one of `validators`.
 * Use this to create a predicate for a union type.
 * e.g.
 * ```
 * import * as schema from './schema';
 * const isAscOrDesc: (value: unknown) => value is 'asc' | 'desc' = schema.oneOf([
 *   schema.literal('asc' as const),
 *   schema.literal('desc' as const),
 * ]);
 * ```
 */
export function oneOf<V extends Array<Validator<unknown>>>(validators: V) {
  return function (
    value: unknown
  ): value is V extends Array<Validator<infer ElementType>> ? ElementType : never {
    for (const validator of validators) {
      if (validator(value)) {
        return true;
      }
    }
    return false;
  };
}

/**
 * Validate that `value` is an array and that each of its elements matches `elementValidator`.
 * Use this to create a predicate for an array type.
 * ```
 * import * as schema from './schema';
 * const isAscOrDesc: (value: unknown) => value is 'asc' | 'desc' = schema.oneOf([
 *   schema.literal('asc' as const),
 *   schema.literal('desc' as const),
 * ]);
 * ```
 */
export function array<V extends Validator<unknown>>(elementValidator: V) {
  return function (
    value: unknown
  ): value is Array<V extends Validator<infer ElementType> ? ElementType : never> {
    if (Array.isArray(value)) {
      for (const element of value as unknown[]) {
        const result = elementValidator(element);
        if (!result) {
          return false;
        }
      }
      return true;
    }
    return false;
  };
}

/**
 * The keys of `T` where `undefined` is assignable to the corresponding value.
 * Used to figure out which keys could be made optional.
 */
type KeysWithOptionalValues<T extends { [key: string]: unknown }> = {
  [K in keyof T]: undefined extends T[K] ? K : never;
}[keyof T];

/**
 * `T` with required keys changed to optional if the corresponding value could be `undefined`.
 * Converts a type like `{  key: number | undefined; requiredKey: string }` to a type like `{ key?: number | undefined; requiredKey: string }`
 * This allows us to write object literals that omit a key if the value can accept `undefined`.
 */
type OptionalKeyWhenValueAcceptsUndefined<T extends { [key: string]: unknown }> = {
  [K in Exclude<keyof T, KeysWithOptionalValues<T>>]: T[K];
} &
  {
    [K in KeysWithOptionalValues<T>]?: Exclude<T[K], undefined>;
  };

/**
 * Validate that `value` is an object with string keys. The value at each key is tested against its own validator.
 *
 * Use this to create a predicate for a type like `{ a: string[] }`. For example:
 * ```ts
 * import * as schema from './schema';
 * const myValidator: (value: unknown) => value is { a: string[] } = schema.object({
 *   a: schema.array(schema.string()),
 * });
 * ```
 */
export function object<
  ValidatorDictionary extends {
    [key: string]: Validator<unknown>;
  }
>(validatorDictionary: ValidatorDictionary) {
  return function (
    value: unknown
  ): value is /** If a key can point to `undefined`, then instead make the key optional and exclude `undefined` from the value type. */ OptionalKeyWhenValueAcceptsUndefined<
    {
      [K in keyof ValidatorDictionary]: TypeOf<ValidatorDictionary[K]>;
    }
  > {
    // This only validates non-null objects
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    // Rebind value as the result type so that we can interrogate it
    const trusted = value as { [K in keyof ValidatorDictionary]: TypeOf<ValidatorDictionary[K]> };

    // Get each validator in the validator dictionary and use it to validate the corresponding value
    for (const key of Object.keys(validatorDictionary)) {
      const validator = validatorDictionary[key];
      if (!validator(trusted[key])) {
        return false;
      }
    }
    return true;
  };
}

/**
 * Validate that `value` is strictly equal to `acceptedValue`.
 * Use this for a literal type, for example:
 * ```
 * import * as schema from './schema';
 * const isAscOrDesc: (value: unknown) => value is 'asc' | 'desc' = schema.oneOf([
 *   schema.literal('asc' as const),
 *   schema.literal('desc' as const),
 * ]);
 * ```
 */
export function literal<T>(acceptedValue: T) {
  return function (value: unknown): value is T {
    return acceptedValue === value;
  };
}

/**
 * Validate that `value` is a string.
 * NB: this is used as `string` externally via named export.
 * Usage:
 * ```
 * import * as schema from './schema';
 * const isString: (value: unknown) => value is string = schema.string();
 * ```
 */
function anyString(): (value: unknown) => value is string {
  return function (value: unknown): value is string {
    return typeof value === 'string';
  };
}

/**
 * Validate that `value` is a number.
 * NB: this just checks if `typeof value === 'number'`. It will return `true` for `NaN`.
 * NB: this is used as `number` externally via named export.
 * Usage:
 * ```
 * import * as schema from './schema';
 * const isNumber: (value: unknown) => value is number = schema.number();
 * ```
 */
function anyNumber(): (value: unknown) => value is number {
  return function (value: unknown): value is number {
    return typeof value === 'number';
  };
}

/**
 * Export `anyString` as `string`. We can't define a function named `string`.
 * Export `anyNumber` as `number`. We can't define a function named `number`.
 */
export { anyString as string, anyNumber as number };
