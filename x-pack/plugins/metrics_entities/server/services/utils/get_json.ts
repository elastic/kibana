/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: Move indent to configuration part or flip to default false
export const getJSON = (body: unknown, indent: boolean = true): string =>
  indent ? JSON.stringify(body, null, 2) : JSON.stringify(body);
