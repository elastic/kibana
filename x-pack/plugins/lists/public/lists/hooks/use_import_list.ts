/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useAsyncTask } from '../../common/hooks/use_async_task';
import { ImportListParams } from '../types';
import { importList } from '../api';

export type ImportListTaskArgs = Omit<ImportListParams, 'signal'>;

const importListTask = (
  { signal }: AbortController,
  args: ImportListTaskArgs
): ReturnType<typeof importList> => importList({ signal, ...args });

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const useImportList = () => useAsyncTask(importListTask);
