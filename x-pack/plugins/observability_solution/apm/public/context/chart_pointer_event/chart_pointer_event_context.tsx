/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, ReactNode, useRef } from 'react';

import { PointerEvent } from '@elastic/charts';

export const UPDATE_POINTER_EVENT = 'updatePointerEvent';
export const ChartPointerEventContext = createContext<{
  pointerEventTargetRef: React.MutableRefObject<EventTarget>;
  updatePointerEvent: (pointerEvent: PointerEvent) => void;
} | null>(null);

export function ChartPointerEventContextProvider({ children }: { children: ReactNode }) {
  const pointerEventTargetRef = useRef(new EventTarget());
  const updatePointerEventRef = useRef((pointerEvent: PointerEvent) => {
    pointerEventTargetRef.current.dispatchEvent(
      new CustomEvent(UPDATE_POINTER_EVENT, { detail: pointerEvent })
    );
  });

  return (
    <ChartPointerEventContext.Provider
      value={{
        pointerEventTargetRef,
        updatePointerEvent: updatePointerEventRef.current,
      }}
      children={children}
    />
  );
}
