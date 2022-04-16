/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, useMemo } from 'react';

import {
  isArrowDownOrArrowUp,
  isArrowUp,
  isEscape,
  focusColumn,
  OnColumnFocused,
} from '@kbn/timelines-plugin/public';

type FocusOwnership = 'not-owned' | 'owned';

export const getSameOrNextAriaRowindex = ({
  ariaRowindex,
  event,
}: {
  ariaRowindex: number;
  event: React.KeyboardEvent<HTMLDivElement>;
}): number => (isArrowUp(event) ? ariaRowindex : ariaRowindex + 1);

export const useStatefulEventFocus = ({
  ariaRowindex,
  colindexAttribute,
  containerRef,
  lastFocusedAriaColindex,
  onColumnFocused,
  rowindexAttribute,
}: {
  ariaRowindex: number;
  colindexAttribute: string;
  containerRef: React.MutableRefObject<HTMLDivElement | null>;
  lastFocusedAriaColindex: number;
  onColumnFocused: OnColumnFocused;
  rowindexAttribute: string;
}) => {
  const [focusOwnership, setFocusOwnership] = useState<FocusOwnership>('not-owned');

  const onFocus = useCallback(() => {
    setFocusOwnership((prevFocusOwnership) => {
      if (prevFocusOwnership !== 'owned') {
        return 'owned';
      }
      return prevFocusOwnership;
    });
  }, []);

  const onOutsideClick = useCallback(() => {
    setFocusOwnership('not-owned');
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (isArrowDownOrArrowUp(e) || isEscape(e)) {
        e.preventDefault();
        e.stopPropagation();

        setFocusOwnership('not-owned');

        const newAriaRowindex = isEscape(e)
          ? ariaRowindex // return focus to the same row
          : getSameOrNextAriaRowindex({ ariaRowindex, event: e });

        setTimeout(() => {
          onColumnFocused(
            focusColumn({
              ariaColindex: lastFocusedAriaColindex,
              ariaRowindex: newAriaRowindex,
              colindexAttribute,
              containerElement: containerRef.current,
              rowindexAttribute,
            })
          );
        }, 0);
      }
    },
    [
      ariaRowindex,
      colindexAttribute,
      containerRef,
      lastFocusedAriaColindex,
      onColumnFocused,
      rowindexAttribute,
    ]
  );

  const memoizedReturn = useMemo(
    () => ({ focusOwnership, onFocus, onOutsideClick, onKeyDown }),
    [focusOwnership, onFocus, onKeyDown, onOutsideClick]
  );

  return memoizedReturn;
};
