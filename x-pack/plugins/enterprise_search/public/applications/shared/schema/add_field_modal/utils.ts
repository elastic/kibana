/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const formatFieldName = (rawName: string) =>
  rawName
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^(_+)|(_+)$/g, '')
    .toLowerCase();
