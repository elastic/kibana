/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo, useState } from 'react';
import { ISimpleFields, ConfigKeys, ScheduleUnit, DataStream } from '../types';

interface ISimpleFieldsContext {
  setFields: React.Dispatch<React.SetStateAction<ISimpleFields>>;
  fields: ISimpleFields;
  defaultValues: ISimpleFields;
}

interface ISimpleFieldsContextProvider {
  children: React.ReactNode;
  defaultValues?: ISimpleFields;
}

export const initialValues = {
  [ConfigKeys.HOSTS]: '',
  [ConfigKeys.MAX_REDIRECTS]: '0',
  [ConfigKeys.MONITOR_TYPE]: DataStream.HTTP,
  [ConfigKeys.SCHEDULE]: {
    number: '3',
    unit: ScheduleUnit.MINUTES,
  },
  [ConfigKeys.APM_SERVICE_NAME]: '',
  [ConfigKeys.TAGS]: [],
  [ConfigKeys.TIMEOUT]: '16',
  [ConfigKeys.URLS]: '',
  [ConfigKeys.WAIT]: '1',
};

const defaultContext: ISimpleFieldsContext = {
  setFields: (_fields: React.SetStateAction<ISimpleFields>) => {
    throw new Error('setSimpleFields was not initialized, set it when you invoke the context');
  },
  fields: initialValues, // mutable
  defaultValues: initialValues, // immutable
};

export const SimpleFieldsContext = createContext(defaultContext);

export const SimpleFieldsContextProvider = ({
  children,
  defaultValues = initialValues,
}: ISimpleFieldsContextProvider) => {
  const [fields, setFields] = useState<ISimpleFields>(defaultValues);

  const value = useMemo(() => {
    return { fields, setFields, defaultValues };
  }, [fields, defaultValues]);

  return <SimpleFieldsContext.Provider value={value} children={children} />;
};

export const useSimpleFieldsContext = () => useContext(SimpleFieldsContext);
