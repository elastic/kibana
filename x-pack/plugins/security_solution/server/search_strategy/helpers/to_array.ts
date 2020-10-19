/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const toArray = <T = string>(value: T | T[] | null): T[] =>
  Array.isArray(value) ? value : value == null ? [] : [value];

export const toStringArray = <T = string>(value: T | T[] | null): T[] | string[] =>
  Array.isArray(value) ? value : value == null ? [] : [`${value}`];
