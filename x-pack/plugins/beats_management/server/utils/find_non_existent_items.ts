/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface RandomItem {
  id: string;
  [key: string]: any;
}

export function findNonExistentItems(items: RandomItem[], requestedItems: any) {
  return requestedItems.reduce((nonExistentItems: string[], requestedItem: string, idx: number) => {
    if (items.findIndex((item: RandomItem) => item && item.id === requestedItem) === -1) {
      nonExistentItems.push(requestedItems[idx]);
    }
    return nonExistentItems;
  }, []);
}
