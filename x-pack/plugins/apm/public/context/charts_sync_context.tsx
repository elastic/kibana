/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { ReactNode, useState } from 'react';

export const ChartsSyncContext2 = React.createContext<{
  event: any;
  setEvent: Function;
} | null>(null);

export function ChartsSyncContextProvider2({
  children,
}: {
  children: ReactNode;
}) {
  const [event, setEvent] = useState({});

  return (
    <ChartsSyncContext2.Provider
      value={{ event, setEvent }}
      children={children}
    />
  );
}
