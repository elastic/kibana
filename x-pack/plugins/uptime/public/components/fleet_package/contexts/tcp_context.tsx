/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo, useState } from 'react';
import { TCPSimpleFields, ConfigKey, DataStream } from '../types';
import { defaultValues as commonDefaultValues } from '../common/default_values';

interface TCPSimpleFieldsContext {
  setFields: React.Dispatch<React.SetStateAction<TCPSimpleFields>>;
  fields: TCPSimpleFields;
  defaultValues: TCPSimpleFields;
}

interface TCPSimpleFieldsContextProvider {
  children: React.ReactNode;
  defaultValues?: TCPSimpleFields;
}

export const initialValues: TCPSimpleFields = {
  ...commonDefaultValues,
  [ConfigKey.METADATA]: {
    is_tls_enabled: false,
  },
  [ConfigKey.HOSTS]: '',
  [ConfigKey.MONITOR_TYPE]: DataStream.TCP,
};

const defaultContext: TCPSimpleFieldsContext = {
  setFields: (_fields: React.SetStateAction<TCPSimpleFields>) => {
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
}: TCPSimpleFieldsContextProvider) => {
  const [fields, setFields] = useState<TCPSimpleFields>(defaultValues);

  const value = useMemo(() => {
    return { fields, setFields, defaultValues };
  }, [fields, defaultValues]);

  return <TCPSimpleFieldsContext.Provider value={value} children={children} />;
};

export const useTCPSimpleFieldsContext = () => useContext(TCPSimpleFieldsContext);
