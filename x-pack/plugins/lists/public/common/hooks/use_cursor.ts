/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useState } from 'react';

export interface UseCursorArgs {
  pageIndex: number;
  pageSize: number;
}
type Cursor = string | undefined;
type SetCursor = (cursor: Cursor, args: UseCursorArgs) => void;
type UseCursor = (args: UseCursorArgs) => [Cursor, SetCursor];

const hash = (args: UseCursorArgs): string => JSON.stringify(args);

export const useCursor: UseCursor = (args) => {
  const [cache, setCache] = useState<Record<string, Cursor>>({});

  const setCursor = useCallback<SetCursor>(
    (cursor, _args) => {
      setCache({
        ...cache,
        [hash(_args)]: cursor,
      });
    },
    [cache]
  );

  const cursor = cache[hash(args)];
  return [cursor, setCursor];
};
