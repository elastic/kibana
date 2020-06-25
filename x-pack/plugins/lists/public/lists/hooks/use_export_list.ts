/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useAsyncTask } from '../../common/hooks/use_async_task';
import { ExportListParams } from '../types';
import { exportList } from '../api';

export type ExportListTaskArgs = Omit<ExportListParams, 'signal'>;

const exportListTask = (
  { signal }: AbortController,
  args: ExportListTaskArgs
): ReturnType<typeof exportList> => exportList({ signal, ...args });

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const useExportList = () => useAsyncTask(exportListTask);
