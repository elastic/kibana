/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo, useState } from 'react';
import { IHTTPSimpleFields, ConfigKeys, ScheduleUnit, DataStream } from '../types';

interface IHTTPSimpleFieldsContext {
  setFields: React.Dispatch<React.SetStateAction<IHTTPSimpleFields>>;
  fields: IHTTPSimpleFields;
  defaultValues: IHTTPSimpleFields;
}

interface IHTTPSimpleFieldsContextProvider {
  children: React.ReactNode;
  defaultValues?: IHTTPSimpleFields;
}

export const initialValues = {
  [ConfigKeys.URLS]: '',
  [ConfigKeys.MAX_REDIRECTS]: '0',
  [ConfigKeys.MONITOR_TYPE]: DataStream.HTTP,
  [ConfigKeys.SCHEDULE]: {
    number: '3',
    unit: ScheduleUnit.MINUTES,
  },
  [ConfigKeys.APM_SERVICE_NAME]: '',
  [ConfigKeys.TAGS]: [],
  [ConfigKeys.TIMEOUT]: '16',
};

const defaultContext: IHTTPSimpleFieldsContext = {
  setFields: (_fields: React.SetStateAction<IHTTPSimpleFields>) => {
    throw new Error(
      'setFields was not initialized for HTTP Simple Fields, set it when you invoke the context'
    );
  },
  fields: initialValues, // mutable
  defaultValues: initialValues, // immutable
};

export const HTTPSimpleFieldsContext = createContext(defaultContext);

export const HTTPSimpleFieldsContextProvider = ({
  children,
  defaultValues = initialValues,
}: IHTTPSimpleFieldsContextProvider) => {
  const [fields, setFields] = useState<IHTTPSimpleFields>(defaultValues);

  const value = useMemo(() => {
    return { fields, setFields, defaultValues };
  }, [fields, defaultValues]);

  return <HTTPSimpleFieldsContext.Provider value={value} children={children} />;
};

export const useHTTPSimpleFieldsContext = () => useContext(HTTPSimpleFieldsContext);
