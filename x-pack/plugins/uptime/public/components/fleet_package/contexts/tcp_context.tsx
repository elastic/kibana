/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo, useState } from 'react';
import { ITCPSimpleFields, ConfigKeys, ScheduleUnit, DataStream } from '../types';

interface ITCPSimpleFieldsContext {
  setFields: React.Dispatch<React.SetStateAction<ITCPSimpleFields>>;
  fields: ITCPSimpleFields;
  defaultValues: ITCPSimpleFields;
}

interface ITCPSimpleFieldsContextProvider {
  children: React.ReactNode;
  defaultValues?: ITCPSimpleFields;
}

export const initialValues = {
  [ConfigKeys.HOSTS]: '',
  [ConfigKeys.MAX_REDIRECTS]: '0',
  [ConfigKeys.MONITOR_TYPE]: DataStream.TCP,
  [ConfigKeys.SCHEDULE]: {
    number: '3',
    unit: ScheduleUnit.MINUTES,
  },
  [ConfigKeys.APM_SERVICE_NAME]: '',
  [ConfigKeys.TAGS]: [],
  [ConfigKeys.TIMEOUT]: '16',
};

const defaultContext: ITCPSimpleFieldsContext = {
  setFields: (_fields: React.SetStateAction<ITCPSimpleFields>) => {
    throw new Error(
      'setFields was not initialized for TCP Simple Fields, set it when you invoke the context'
    );
  },
  fields: initialValues, // mutable
  defaultValues: initialValues, // immutable
};

export const TCPSimpleFieldsContext = createContext(defaultContext);

export const TCPSimpleFieldsContextProvider = ({
  children,
  defaultValues = initialValues,
}: ITCPSimpleFieldsContextProvider) => {
  const [fields, setFields] = useState<ITCPSimpleFields>(defaultValues);

  const value = useMemo(() => {
    return { fields, setFields, defaultValues };
  }, [fields, defaultValues]);

  return <TCPSimpleFieldsContext.Provider value={value} children={children} />;
};

export const useTCPSimpleFieldsContext = () => useContext(TCPSimpleFieldsContext);
