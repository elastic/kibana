/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NONE_GROUP_KEY } from './types';

export * from './container';
export * from './query';
export * from './query/types';
export * from './groups_selector';
export * from './types';

export const isNoneGroup = (groupKey: string) => groupKey === NONE_GROUP_KEY;
