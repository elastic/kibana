/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function findNonExistentItems(items: any, requestedItems: any) {
  return items.reduce((nonExistentItems: any, item: any, idx: any) => {
    if (!item.found) {
      nonExistentItems.push(requestedItems[idx]);
    }
    return nonExistentItems;
  }, []);
}
