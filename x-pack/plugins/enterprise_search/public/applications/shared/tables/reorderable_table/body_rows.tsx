/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

export interface BodyRowsProps<Item> {
  items: Item[];
  renderItem: (item: Item, itemIndex: number) => React.ReactNode;
}

export const BodyRows = <Item extends object>({ items, renderItem }: BodyRowsProps<Item>) => (
  <>{items.map(renderItem)}</>
);
