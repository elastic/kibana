/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useAsyncTask } from '../../common/hooks/use_async_task';
import { DeleteListParams } from '../types';
import { deleteList } from '../api';

export type DeleteListTaskArgs = Omit<DeleteListParams, 'signal'>;

const deleteListsTask = (
  { signal }: AbortController,
  args: DeleteListTaskArgs
): ReturnType<typeof deleteList> => deleteList({ signal, ...args });

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const useDeleteList = () => useAsyncTask(deleteListsTask);
