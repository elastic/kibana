/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface Enum<T> {
  [s: string]: T;
}

/**
 * WARNING: It works only with string enums.
 * https://www.typescriptlang.org/docs/handbook/enums.html#string-enums
 *
 * Converts a string into a corresponding enum value.
 * Returns null if the value is not in the enum.
 *
 * @param enm Specified enum.
 * @returns Enum value or null.
 *
 * @example
 * enum MyEnum {
 *   'foo' = 'foo',
 *   'bar' = 'bar',
 * }
 *
 * const foo = enumFromString(MyEnum)('foo'); // MyEnum.foo
 * const bar = enumFromString(MyEnum)('bar'); // MyEnum.bar
 * const unknown = enumFromString(MyEnum)('xyz'); // null
 */
export const enumFromString = <T>(enm: Enum<T>) => {
  const supportedEnumValues = Object.values(enm) as unknown as string[];
  return (value: string | null | undefined): T | null => {
    return value && supportedEnumValues.includes(value) ? (value as unknown as T) : null;
  };
};
