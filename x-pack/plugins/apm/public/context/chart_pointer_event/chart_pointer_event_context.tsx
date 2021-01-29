/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useState,
} from 'react';

import { PointerEvent } from '@elastic/charts';

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
