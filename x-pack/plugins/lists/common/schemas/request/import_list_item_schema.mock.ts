/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ImportListItemSchema } from './import_list_item_schema';

export const getImportListItemSchemaMock = (): ImportListItemSchema => ({
  file: {},
});

/**
 * This is useful for end to end tests, it will return a buffer given a string array
 * of things to import.
 * @param input Array of strings of things to import
 */
export const getImportListItemAsBuffer = (input: string[]): Buffer => {
  return Buffer.from(input.join('\r\n'));
};
