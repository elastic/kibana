/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo, useState } from 'react';
import { TCPAdvancedFields } from '../types';
import { DEFAULT_TCP_ADVANCED_FIELDS } from '../../../../../common/constants/monitor_defaults';

interface TCPAdvancedFieldsContext {
  setFields: React.Dispatch<React.SetStateAction<TCPAdvancedFields>>;
  fields: TCPAdvancedFields;
  defaultValues: TCPAdvancedFields;
}

interface TCPAdvancedFieldsContextProvider {
  children: React.ReactNode;
  defaultValues?: TCPAdvancedFields;
}

export const initialValues: TCPAdvancedFields = DEFAULT_TCP_ADVANCED_FIELDS;

const defaultContext: TCPAdvancedFieldsContext = {
  setFields: (_fields: React.SetStateAction<TCPAdvancedFields>) => {
    throw new Error('setFields was not initialized, set it when you invoke the context');
  },
  fields: initialValues, // mutable
  defaultValues: initialValues, // immutable
};

export const TCPAdvancedFieldsContext = createContext(defaultContext);

export const TCPAdvancedFieldsContextProvider = ({
  children,
  defaultValues = initialValues,
}: TCPAdvancedFieldsContextProvider) => {
  const [fields, setFields] = useState<TCPAdvancedFields>(defaultValues);

  const value = useMemo(() => {
    return { fields, setFields, defaultValues };
  }, [fields, defaultValues]);

  return <TCPAdvancedFieldsContext.Provider value={value} children={children} />;
};

export const useTCPAdvancedFieldsContext = () => useContext(TCPAdvancedFieldsContext);
