/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const MIN_ACTION_COLUMN_HEADER_WIDTH = 75;
const ITEM_SIZES: { [key: string]: number } = {
  s: 32, // This module is ready for icons with size 's' only
};
const BORDER_SIZE_PER_ACTION = 1;
const PADDING_SIZE_PER_ACTION = 6 * 2; // left and right

export const getActionsColumnWidth = (actions: number, size = 's') => {
  const width = ITEM_SIZES[size] * actions + PADDING_SIZE_PER_ACTION + BORDER_SIZE_PER_ACTION;
  return width > MIN_ACTION_COLUMN_HEADER_WIDTH ? width : MIN_ACTION_COLUMN_HEADER_WIDTH;
};
