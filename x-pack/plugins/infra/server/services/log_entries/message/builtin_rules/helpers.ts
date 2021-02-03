/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const labelField = (label: string, field: string) => [
  { constant: ' ' },
  { constant: label },
  { constant: '=' },
  { field },
];

export const labelFieldsPrefix = (label: string, fieldsPrefix: string) => [
  { constant: ' ' },
  { constant: label },
  { constant: '=' },
  { fieldsPrefix },
];
