/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from 'gpt-tokenizer';

export function withTokenBudget<T extends unknown>(
  items: T[],
  budget: number,
  contentAccessor: (item: T) => string = asStringAccessor,
  allowSingleBreach: boolean = false
) {
  const itemsWithinBudget: T[] = [];
  let usedBudget = 0;

  for (const item of items) {
    const content = contentAccessor(item);
    const tokenCount = encode(content).length;
    const fitsInBudget = usedBudget + tokenCount <= budget;

    if (fitsInBudget) {
      itemsWithinBudget.push(item);
      usedBudget += tokenCount;
    } else {
      if (allowSingleBreach) {
        itemsWithinBudget.push(item);
      }
      break;
    }
  }

  return itemsWithinBudget;
}

export function asStringAccessor(item: unknown) {
  if (typeof item === 'string') {
    return item;
  }

  return JSON.stringify(item);
}
