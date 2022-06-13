/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo, useState } from 'react';
import { BrowserSimpleFields } from '../types';
import { DEFAULT_BROWSER_SIMPLE_FIELDS } from '../../../../../common/constants/monitor_defaults';

interface BrowserSimpleFieldsContext {
  setFields: React.Dispatch<React.SetStateAction<BrowserSimpleFields>>;
  fields: BrowserSimpleFields;
  defaultValues: BrowserSimpleFields;
}

interface BrowserSimpleFieldsContextProvider {
  children: React.ReactNode;
  defaultValues?: BrowserSimpleFields;
}

export const initialValues: BrowserSimpleFields = DEFAULT_BROWSER_SIMPLE_FIELDS;

const defaultContext: BrowserSimpleFieldsContext = {
  setFields: (_fields: React.SetStateAction<BrowserSimpleFields>) => {
    throw new Error(
      'setFields was not initialized for Browser Simple Fields, set it when you invoke the context'
    );
  },
  fields: initialValues, // mutable
  defaultValues: initialValues, // immutable
};

export const BrowserSimpleFieldsContext = createContext(defaultContext);

export const BrowserSimpleFieldsContextProvider = ({
  children,
  defaultValues = initialValues,
}: BrowserSimpleFieldsContextProvider) => {
  const [fields, setFields] = useState<BrowserSimpleFields>(defaultValues);

  const value = useMemo(() => {
    return { fields, setFields, defaultValues };
  }, [fields, defaultValues]);

  return <BrowserSimpleFieldsContext.Provider value={value} children={children} />;
};

export const useBrowserSimpleFieldsContext = () => useContext(BrowserSimpleFieldsContext);
