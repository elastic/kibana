/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const wrapBodyResponse = (obj: object) => JSON.stringify({ body: JSON.stringify(obj) });

export const unwrapBodyResponse = (string: string) => JSON.parse(JSON.parse(string).body);
