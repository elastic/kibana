/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo, useState } from 'react';
import { DEFAULT_NAMESPACE_STRING } from '../../../../common/constants';
import {
  ScheduleUnit,
  MonitorServiceLocations,
  ThrottlingOptions,
  DEFAULT_THROTTLING,
} from '../../../../common/runtime_types';
import { DataStream } from '../types';

interface IPolicyConfigContext {
  setMonitorType: React.Dispatch<React.SetStateAction<DataStream>>;
  setName: React.Dispatch<React.SetStateAction<string>>;
  setLocations: React.Dispatch<React.SetStateAction<MonitorServiceLocations>>;
  setIsTLSEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  setIsZipUrlTLSEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  setNamespace: React.Dispatch<React.SetStateAction<string>>;
  monitorType: DataStream;
  defaultMonitorType: DataStream;
  isTLSEnabled?: boolean;
  isZipUrlTLSEnabled?: boolean;
  isZipUrlSourceEnabled?: boolean;
  runsOnService?: boolean;
  defaultIsTLSEnabled?: boolean;
  defaultIsZipUrlTLSEnabled?: boolean;
  isEditable?: boolean;
  defaultName?: string;
  name?: string;
  defaultLocations?: MonitorServiceLocations;
  locations?: MonitorServiceLocations;
  allowedScheduleUnits?: ScheduleUnit[];
  defaultNamespace?: string;
  namespace?: string;
  throttling: ThrottlingOptions;
}

export interface IPolicyConfigContextProvider {
  children: React.ReactNode;
  defaultMonitorType?: DataStream;
  runsOnService?: boolean;
  defaultIsTLSEnabled?: boolean;
  defaultIsZipUrlTLSEnabled?: boolean;
  defaultName?: string;
  defaultLocations?: MonitorServiceLocations;
  defaultNamespace?: string;
  isEditable?: boolean;
  isZipUrlSourceEnabled?: boolean;
  allowedScheduleUnits?: ScheduleUnit[];
  throttling?: ThrottlingOptions;
}

export const initialValue = DataStream.HTTP;

export const defaultContext: IPolicyConfigContext = {
  setMonitorType: (_monitorType: React.SetStateAction<DataStream>) => {
    throw new Error('setMonitorType was not initialized, set it when you invoke the context');
  },
  setName: (_name: React.SetStateAction<string>) => {
    throw new Error('setName was not initialized, set it when you invoke the context');
  },
  setLocations: (_locations: React.SetStateAction<MonitorServiceLocations>) => {
    throw new Error('setLocations was not initialized, set it when you invoke the context');
  },
  setIsTLSEnabled: (_isTLSEnabled: React.SetStateAction<boolean>) => {
    throw new Error('setIsTLSEnabled was not initialized, set it when you invoke the context');
  },
  setIsZipUrlTLSEnabled: (_isZipUrlTLSEnabled: React.SetStateAction<boolean>) => {
    throw new Error(
      'setIsZipUrlTLSEnabled was not initialized, set it when you invoke the context'
    );
  },
  setNamespace: (_namespace: React.SetStateAction<string>) => {
    throw new Error('setNamespace was not initialized, set it when you invoke the context');
  },
  monitorType: initialValue, // mutable
  defaultMonitorType: initialValue, // immutable,
  runsOnService: false,
  defaultIsTLSEnabled: false,
  defaultIsZipUrlTLSEnabled: false,
  defaultName: '',
  defaultLocations: [],
  isEditable: false,
  isZipUrlSourceEnabled: true,
  allowedScheduleUnits: [ScheduleUnit.MINUTES, ScheduleUnit.SECONDS],
  defaultNamespace: DEFAULT_NAMESPACE_STRING,
  throttling: DEFAULT_THROTTLING,
};

export const PolicyConfigContext = createContext(defaultContext);

export function PolicyConfigContextProvider<ExtraFields = unknown>({
  children,
  throttling = DEFAULT_THROTTLING,
  defaultMonitorType = initialValue,
  defaultIsTLSEnabled = false,
  defaultIsZipUrlTLSEnabled = false,
  defaultName = '',
  defaultLocations = [],
  defaultNamespace = DEFAULT_NAMESPACE_STRING,
  isEditable = false,
  runsOnService = false,
  isZipUrlSourceEnabled = true,
  allowedScheduleUnits = [ScheduleUnit.MINUTES, ScheduleUnit.SECONDS],
}: IPolicyConfigContextProvider) {
  const [monitorType, setMonitorType] = useState<DataStream>(defaultMonitorType);
  const [name, setName] = useState<string>(defaultName);
  const [locations, setLocations] = useState<MonitorServiceLocations>(defaultLocations);
  const [isTLSEnabled, setIsTLSEnabled] = useState<boolean>(defaultIsTLSEnabled);
  const [isZipUrlTLSEnabled, setIsZipUrlTLSEnabled] = useState<boolean>(defaultIsZipUrlTLSEnabled);
  const [namespace, setNamespace] = useState<string>(defaultNamespace);

  const value = useMemo(() => {
    return {
      monitorType,
      setMonitorType,
      defaultMonitorType,
      runsOnService,
      isTLSEnabled,
      isZipUrlTLSEnabled,
      setIsTLSEnabled,
      setIsZipUrlTLSEnabled,
      defaultIsTLSEnabled,
      defaultIsZipUrlTLSEnabled,
      isEditable,
      defaultName,
      name,
      setName,
      defaultLocations,
      locations,
      setLocations,
      isZipUrlSourceEnabled,
      allowedScheduleUnits,
      namespace,
      setNamespace,
      throttling,
    } as IPolicyConfigContext;
  }, [
    monitorType,
    defaultMonitorType,
    runsOnService,
    isTLSEnabled,
    isZipUrlSourceEnabled,
    isZipUrlTLSEnabled,
    defaultIsTLSEnabled,
    defaultIsZipUrlTLSEnabled,
    isEditable,
    name,
    defaultName,
    locations,
    defaultLocations,
    allowedScheduleUnits,
    namespace,
    throttling,
  ]);

  return <PolicyConfigContext.Provider value={value} children={children} />;
}

export function usePolicyConfigContext() {
  return useContext(PolicyConfigContext);
}
