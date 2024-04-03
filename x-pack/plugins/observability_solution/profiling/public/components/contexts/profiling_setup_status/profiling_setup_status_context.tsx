/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { ProfilingSetupStatus } from '../../../services';

export const ProfilingSetupStatusContext = React.createContext<
  | {
      profilingSetupStatus: ProfilingSetupStatus | undefined;
      setProfilingSetupStatus: React.Dispatch<
        React.SetStateAction<ProfilingSetupStatus | undefined>
      >;
    }
  | undefined
>(undefined);

export function ProfilingSetupStatusContextProvider({
  children,
}: {
  children: React.ReactElement;
}) {
  const [profilingSetupStatus, setProfilingSetupStatus] = useState<
    ProfilingSetupStatus | undefined
  >();

  return (
    <ProfilingSetupStatusContext.Provider value={{ profilingSetupStatus, setProfilingSetupStatus }}>
      {children}
    </ProfilingSetupStatusContext.Provider>
  );
}
