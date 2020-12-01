/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const TEXT = 'text';
export const NUMBER = 'number';
export const DATE = 'date';
export const GEOLOCATION = 'geolocation';

export const fieldTypeSelectOptions = [
  { value: TEXT, text: TEXT },
  { value: NUMBER, text: NUMBER },
  { value: DATE, text: DATE },
  { value: GEOLOCATION, text: GEOLOCATION },
];
