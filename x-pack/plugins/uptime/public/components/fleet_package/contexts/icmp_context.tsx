/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo, useState } from 'react';
import { IICMPSimpleFields, ConfigKeys, ScheduleUnit, DataStream } from '../types';

interface IICMPSimpleFieldsContext {
  setFields: React.Dispatch<React.SetStateAction<IICMPSimpleFields>>;
  fields: IICMPSimpleFields;
  defaultValues: IICMPSimpleFields;
}

interface IICMPSimpleFieldsContextProvider {
  children: React.ReactNode;
  defaultValues?: IICMPSimpleFields;
}

export const initialValues = {
  [ConfigKeys.HOSTS]: '',
  [ConfigKeys.MAX_REDIRECTS]: '0',
  [ConfigKeys.MONITOR_TYPE]: DataStream.ICMP,
  [ConfigKeys.SCHEDULE]: {
    number: '3',
    unit: ScheduleUnit.MINUTES,
  },
  [ConfigKeys.APM_SERVICE_NAME]: '',
  [ConfigKeys.TAGS]: [],
  [ConfigKeys.TIMEOUT]: '16',
  [ConfigKeys.WAIT]: '1',
};

const defaultContext: IICMPSimpleFieldsContext = {
  setFields: (_fields: React.SetStateAction<IICMPSimpleFields>) => {
    throw new Error(
      'setFields was not initialized for ICMP Simple Fields, set it when you invoke the context'
    );
  },
  fields: initialValues, // mutable
  defaultValues: initialValues, // immutable
};

export const ICMPSimpleFieldsContext = createContext(defaultContext);

export const ICMPSimpleFieldsContextProvider = ({
  children,
  defaultValues = initialValues,
}: IICMPSimpleFieldsContextProvider) => {
  const [fields, setFields] = useState<IICMPSimpleFields>(defaultValues);

  const value = useMemo(() => {
    return { fields, setFields, defaultValues };
  }, [fields, defaultValues]);

  return <ICMPSimpleFieldsContext.Provider value={value} children={children} />;
};

export const useICMPSimpleFieldsContext = () => useContext(ICMPSimpleFieldsContext);
