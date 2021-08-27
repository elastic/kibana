/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PointerEvent } from '@elastic/charts';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import React, { createContext, useState } from 'react';

export const ChartPointerEventContext = createContext<{
  pointerEvent: PointerEvent | null;
  setPointerEvent: Dispatch<SetStateAction<PointerEvent | null>>;
} | null>(null);

export function ChartPointerEventContextProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [pointerEvent, setPointerEvent] = useState<PointerEvent | null>(null);

  return (
    <ChartPointerEventContext.Provider
      value={{ pointerEvent, setPointerEvent }}
      children={children}
    />
  );
}
