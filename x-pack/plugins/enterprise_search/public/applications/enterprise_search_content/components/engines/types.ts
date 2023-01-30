/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Page } from '../../../../../common/types/pagination';

export const DEFAULT_META = {
  from: 0,
  size: 10,
  total: 0,
};

export const updateMetaPageIndex = (oldState: Page, newPageIndex: number) => {
  return { ...oldState, from: newPageIndex * oldState.size };
};
