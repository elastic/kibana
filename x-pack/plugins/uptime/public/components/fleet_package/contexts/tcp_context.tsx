/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo, useState } from 'react';
import { ITCPSimpleFields, ConfigKeys, DataStream } from '../types';
import { defaultValues as commonDefaultValues } from '../common/default_values';

interface ITCPSimpleFieldsContext {
  setFields: React.Dispatch<React.SetStateAction<ITCPSimpleFields>>;
  fields: ITCPSimpleFields;
  defaultValues: ITCPSimpleFields;
}

interface ITCPSimpleFieldsContextProvider {
  children: React.ReactNode;
  defaultValues?: ITCPSimpleFields;
}

export const initialValues: ITCPSimpleFields = {
  ...commonDefaultValues,
  [ConfigKeys.HOSTS]: '',
  [ConfigKeys.MONITOR_TYPE]: DataStream.TCP,
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
