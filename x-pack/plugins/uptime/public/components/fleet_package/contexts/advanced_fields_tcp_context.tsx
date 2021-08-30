/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo, useState } from 'react';
import { ITCPAdvancedFields, ConfigKeys } from '../types';

interface ITCPAdvancedFieldsContext {
  setFields: React.Dispatch<React.SetStateAction<ITCPAdvancedFields>>;
  fields: ITCPAdvancedFields;
  defaultValues: ITCPAdvancedFields;
}

interface ITCPAdvancedFieldsContextProvider {
  children: React.ReactNode;
  defaultValues?: ITCPAdvancedFields;
}

export const initialValues: ITCPAdvancedFields = {
  [ConfigKeys.PROXY_URL]: '',
  [ConfigKeys.PROXY_USE_LOCAL_RESOLVER]: false,
  [ConfigKeys.RESPONSE_RECEIVE_CHECK]: '',
  [ConfigKeys.REQUEST_SEND_CHECK]: '',
};

const defaultContext: ITCPAdvancedFieldsContext = {
  setFields: (_fields: React.SetStateAction<ITCPAdvancedFields>) => {
    throw new Error('setFields was not initialized, set it when you invoke the context');
  },
  fields: initialValues, // mutable
  defaultValues: initialValues, // immutable
};

export const TCPAdvancedFieldsContext = createContext(defaultContext);

export const TCPAdvancedFieldsContextProvider = ({
  children,
  defaultValues = initialValues,
}: ITCPAdvancedFieldsContextProvider) => {
  const [fields, setFields] = useState<ITCPAdvancedFields>(defaultValues);

  const value = useMemo(() => {
    return { fields, setFields, defaultValues };
  }, [fields, defaultValues]);

  return <TCPAdvancedFieldsContext.Provider value={value} children={children} />;
};

export const useTCPAdvancedFieldsContext = () => useContext(TCPAdvancedFieldsContext);
