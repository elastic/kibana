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
  setIsTLSEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  setIsZipUrlTLSEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  monitorType: DataStream;
  defaultMonitorType: DataStream;
  isTLSEnabled?: boolean;
  isZipUrlTLSEnabled?: boolean;
  defaultIsTLSEnabled?: boolean;
  defaultIsZipUrlTLSEnabled?: boolean;
  isEditable?: boolean;
}

interface IPolicyConfigContextProvider {
  children: React.ReactNode;
  defaultMonitorType?: DataStream;
  defaultIsTLSEnabled?: boolean;
  defaultIsZipUrlTLSEnabled?: boolean;
  isEditable?: boolean;
}

export const initialValue = DataStream.HTTP;

const defaultContext: IPolicyConfigContext = {
  setMonitorType: (_monitorType: React.SetStateAction<DataStream>) => {
    throw new Error('setMonitorType was not initialized, set it when you invoke the context');
  },
  setIsTLSEnabled: (_isTLSEnabled: React.SetStateAction<boolean>) => {
    throw new Error('setIsTLSEnabled was not initialized, set it when you invoke the context');
  },
  setIsZipUrlTLSEnabled: (_isZipUrlTLSEnabled: React.SetStateAction<boolean>) => {
    throw new Error(
      'setIsZipUrlTLSEnabled was not initialized, set it when you invoke the context'
    );
  },
  monitorType: initialValue, // mutable
  defaultMonitorType: initialValue, // immutable,
  defaultIsTLSEnabled: false,
  defaultIsZipUrlTLSEnabled: false,
  isEditable: false,
};

export const PolicyConfigContext = createContext(defaultContext);

export const PolicyConfigContextProvider = ({
  children,
  defaultMonitorType = initialValue,
  defaultIsTLSEnabled = false,
  defaultIsZipUrlTLSEnabled = false,
  isEditable = false,
}: IPolicyConfigContextProvider) => {
  const [monitorType, setMonitorType] = useState<DataStream>(defaultMonitorType);
  const [isTLSEnabled, setIsTLSEnabled] = useState<boolean>(defaultIsTLSEnabled);
  const [isZipUrlTLSEnabled, setIsZipUrlTLSEnabled] = useState<boolean>(defaultIsZipUrlTLSEnabled);

  const value = useMemo(() => {
    return {
      monitorType,
      setMonitorType,
      defaultMonitorType,
      isTLSEnabled,
      isZipUrlTLSEnabled,
      setIsTLSEnabled,
      setIsZipUrlTLSEnabled,
      defaultIsTLSEnabled,
      defaultIsZipUrlTLSEnabled,
      isEditable,
    };
  }, [
    monitorType,
    defaultMonitorType,
    isTLSEnabled,
    isZipUrlTLSEnabled,
    defaultIsTLSEnabled,
    defaultIsZipUrlTLSEnabled,
    isEditable,
  ]);

  return <PolicyConfigContext.Provider value={value} children={children} />;
};

export const usePolicyConfigContext = () => useContext(PolicyConfigContext);
