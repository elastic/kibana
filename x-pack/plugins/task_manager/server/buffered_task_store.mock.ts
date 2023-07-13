/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { BufferedTaskStore } from './buffered_task_store';

const createBufferedTaskStoreMock = () => {
  const mocked: jest.Mocked<PublicMethodsOf<BufferedTaskStore>> = {
    update: jest.fn(),
    remove: jest.fn(),
  };
  return mocked;
};

export const bufferedTaskStoreMock = {
  create: createBufferedTaskStoreMock,
};
