/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* This module is ready for icons with size 's' only */

const MIN_ACTION_COLUMN_WIDTH = 75;
const ITEM_SIZE = 32;
const BORDER_SIZE = 1; // border size of each action
const PADDING_SIZE = 6 * 2; // left and right padding of each action

export const getActionsColumnSize = (actions: number) => {
  const width = ITEM_SIZE * (actions + 1) + PADDING_SIZE + BORDER_SIZE;

  return width > MIN_ACTION_COLUMN_WIDTH ? width : MIN_ACTION_COLUMN_WIDTH;
};
