/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function escapeForElasticsearchQuery(str: string): string;

export function replaceStringTokens(
  str: string,
  valuesByTokenName: {},
  encodeForURI: boolean
): string;

export function detectorToString(dtr: any): string;

export function toLocaleString(x: number): string;
