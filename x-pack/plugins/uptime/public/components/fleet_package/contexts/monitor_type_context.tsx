/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo, useState } from 'react';
import { DataStream } from '../types';

interface IMonitorTypeFieldsContext {
  setMonitorType: React.Dispatch<React.SetStateAction<DataStream>>;
  monitorType: DataStream;
  defaultValue: DataStream;
}

interface IMonitorTypeFieldsContextProvider {
  children: React.ReactNode;
  defaultValue?: DataStream;
}

export const initialValue = DataStream.HTTP;

const defaultContext: IMonitorTypeFieldsContext = {
  setMonitorType: (_monitorType: React.SetStateAction<DataStream>) => {
    throw new Error('setMonitorType was not initialized, set it when you invoke the context');
  },
  monitorType: initialValue, // mutable
  defaultValue: initialValue, // immutable
};

export const MonitorTypeContext = createContext(defaultContext);

export const MonitorTypeContextProvider = ({
  children,
  defaultValue = initialValue,
}: IMonitorTypeFieldsContextProvider) => {
  const [monitorType, setMonitorType] = useState<DataStream>(defaultValue);

  const value = useMemo(() => {
    return { monitorType, setMonitorType, defaultValue };
  }, [monitorType, defaultValue]);

  return <MonitorTypeContext.Provider value={value} children={children} />;
};

export const useMonitorTypeContext = () => useContext(MonitorTypeContext);
