/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useAsyncTask } from '../../common/hooks/use_async_task';
import { FindListsParams } from '../types';
import { findLists } from '../api';

export type FindListsTaskArgs = Omit<FindListsParams, 'signal'>;

const findListsTask = (
  { signal }: AbortController,
  args: FindListsTaskArgs
): ReturnType<typeof findLists> => findLists({ signal, ...args });

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const useFindLists = () => useAsyncTask(findListsTask);
