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
import { Annotation } from '../../common/annotations';
import { useAnnotations } from '../hooks/use_annotations';

export const ChartsSyncContext = createContext<{
  event: any;
  setEvent: Dispatch<SetStateAction<{}>>;
  annotations: Annotation[];
} | null>(null);

export function ChartsSyncContextProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [event, setEvent] = useState({});
  const { annotations } = useAnnotations();

  return (
    <ChartsSyncContext.Provider
      value={{ event, setEvent, annotations }}
      children={children}
    />
  );
}
