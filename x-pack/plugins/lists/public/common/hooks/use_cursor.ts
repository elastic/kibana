/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useState } from 'react';

export interface UseCursorProps {
  pageIndex: number;
  pageSize: number;
}
type Cursor = string | undefined;
type SetCursor = (cursor: Cursor) => void;
type UseCursor = (props: UseCursorProps) => [Cursor, SetCursor];

const hash = (props: UseCursorProps): string => JSON.stringify(props);

export const useCursor: UseCursor = ({ pageIndex, pageSize }) => {
  const [cache, setCache] = useState<Record<string, Cursor>>({});

  const setCursor = useCallback<SetCursor>(
    (cursor) => {
      setCache({
        ...cache,
        [hash({ pageIndex: pageIndex + 1, pageSize })]: cursor,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pageIndex, pageSize]
  );

  let cursor: Cursor;
  for (let i = pageIndex; i >= 0; i--) {
    const currentProps = { pageIndex: i, pageSize };
    cursor = cache[hash(currentProps)];
    if (cursor) {
      break;
    }
  }

  return [cursor, setCursor];
};
