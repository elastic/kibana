/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ItemWithAnID } from '../types';

export const stripIdAndCreatedAtFromItem = (item: ItemWithAnID) => {
  const itemToClean = { ...item } as Partial<ItemWithAnID>;
  delete itemToClean.id;
  delete itemToClean.created_at;
  return itemToClean;
};
