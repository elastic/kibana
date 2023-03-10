/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Matches against anything you want to ignore and if it matches that field is ignored.
 * @param fieldsKey The fields key to match against
 * @param ignoreFields Array of fields to ignore. If a value starts and ends with "/", such as: "/[_]+/" then the field will be treated as a regular expression.
 * If you have an object structure to ignore such as "{ a: { b: c: {} } } ", then you need to ignore it as the string "a.b.c"
 * @returns true if it is a field to ignore, otherwise false
 */
export const isIgnored = (fieldsKey: string, ignoreFields: string[]): boolean => {
  return ignoreFields.some((ignoreField) => {
    if (ignoreField.startsWith('/') && ignoreField.endsWith('/')) {
      return new RegExp(ignoreField.slice(1, -1)).test(fieldsKey);
    } else {
      return fieldsKey === ignoreField;
    }
  });
};
