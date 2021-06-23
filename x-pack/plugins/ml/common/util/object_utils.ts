/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * A type guard to check record like object structures.
 *
 * Examples:
 * - `isPopulatedObject({...})`
 *      Limits type to Record<string, unknown>
 *
 * - `isPopulatedObject({...}, ['attribute'])`
 *      Limits type to Record<'attribute', unknown>
 *
 * - `isPopulatedObject<keyof MyInterface>({...})`
 *      Limits type to a record with keys of the given interface.
 *      Note that you might want to add keys from the interface to the
 *      array of requiredAttributes to satisfy runtime requirements.
 *      Otherwise you'd just satisfy TS requirements but might still
 *      run into runtime issues.
 */
export const isPopulatedObject = <U extends string = string>(
  arg: unknown,
  requiredAttributes: U[] = []
): arg is Record<U, unknown> => {
  return (
    typeof arg === 'object' &&
    arg !== null &&
    Object.keys(arg).length > 0 &&
    (requiredAttributes.length === 0 ||
      requiredAttributes.every((d) => ({}.hasOwnProperty.call(arg, d))))
  );
};

/**
 * Get the first key in the object
 * getFirstKeyInObject({ firstKey: {}, secondKey: {}}) -> firstKey
 */
export const getFirstKeyInObject = (arg: unknown): string | undefined => {
  if (isPopulatedObject(arg)) {
    const keys = Object.keys(arg);
    return keys.length > 0 ? keys[0] : undefined;
  }
};
