/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Ignores any field that is "_ignored". Customers are not allowed to have this field and more importantly this shows up as a bug
 * from EQL as seen here: https://github.com/elastic/elasticsearch/issues/77152
 * Once this ticket is fixed, please remove this function.
 * @param fieldsKey The fields key to match against "_ignored"
 * @returns true if it is a "_ignored", otherwise false
 * @deprecated Remove this once https://github.com/elastic/elasticsearch/issues/77152 is fixed.
 */
export const isEqlBug77152 = (fieldsKey: string): boolean => {
  return fieldsKey === '_ignored';
};
