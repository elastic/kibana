/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { take, toString, truncate, uniq } from 'lodash';

const MAX_MESSAGE_LENGTH = 10240;
const MAX_LIST_LENGTH = 20;

export const truncateMessage = (value: unknown): string => {
  const str = toString(value);
  return truncate(str, { length: MAX_MESSAGE_LENGTH });
};

export const truncateMessageList = (list: string[]): string[] => {
  const deduplicatedList = uniq(list);
  return take(deduplicatedList, MAX_LIST_LENGTH);
};
