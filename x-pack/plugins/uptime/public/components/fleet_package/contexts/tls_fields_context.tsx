/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo, useState } from 'react';
import { TLSFields } from '../types';
import { defaultValues as tlsDefaultValues } from '../tls/default_values';

interface TLSFieldsContext {
  setFields: React.Dispatch<React.SetStateAction<TLSFields>>;
  fields: TLSFields;
  defaultValues: TLSFields;
}

interface TLSFieldsContextProvider {
  children: React.ReactNode;
  defaultValues?: TLSFields;
}

export const initialValues: TLSFields = tlsDefaultValues;

const defaultContext: TLSFieldsContext = {
  setFields: (_fields: React.SetStateAction<TLSFields>) => {
    throw new Error('setFields was not initialized, set it when you invoke the context');
  },
  fields: initialValues, // mutable
  defaultValues: initialValues, // immutable
};

export const TLSFieldsContext = createContext(defaultContext);

export const TLSFieldsContextProvider = ({
  children,
  defaultValues = initialValues,
}: TLSFieldsContextProvider) => {
  const [fields, setFields] = useState<TLSFields>(defaultValues);

  const value = useMemo(() => {
    return { fields, setFields, defaultValues };
  }, [fields, defaultValues]);

  return <TLSFieldsContext.Provider value={value} children={children} />;
};

export const useTLSFieldsContext = () => useContext(TLSFieldsContext);
