/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo, useState } from 'react';
import { DataStream } from '../types';

interface IPolicyConfigContext {
  setMonitorType: React.Dispatch<React.SetStateAction<DataStream>>;
  monitorType: DataStream;
  defaultMonitorType: DataStream;
  isEditable?: boolean;
}

interface IPolicyConfigContextProvider {
  children: React.ReactNode;
  defaultMonitorType?: DataStream;
  isEditable?: boolean;
}

export const initialValue = DataStream.HTTP;

const defaultContext: IPolicyConfigContext = {
  setMonitorType: (_monitorType: React.SetStateAction<DataStream>) => {
    throw new Error('setMonitorType was not initialized, set it when you invoke the context');
  },
  monitorType: initialValue, // mutable
  defaultMonitorType: initialValue, // immutable,
  isEditable: false,
};

export const PolicyConfigContext = createContext(defaultContext);

export const PolicyConfigContextProvider = ({
  children,
  defaultMonitorType = initialValue,
  isEditable = false,
}: IPolicyConfigContextProvider) => {
  const [monitorType, setMonitorType] = useState<DataStream>(defaultMonitorType);

  const value = useMemo(() => {
    return { monitorType, setMonitorType, defaultMonitorType, isEditable };
  }, [monitorType, defaultMonitorType, isEditable]);

  return <PolicyConfigContext.Provider value={value} children={children} />;
};

export const usePolicyConfigContext = () => useContext(PolicyConfigContext);
