/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo, useState } from 'react';
import { BrowserAdvancedFields } from '../types';
import { DEFAULT_BROWSER_ADVANCED_FIELDS } from '../../../../../common/constants/monitor_defaults';

interface BrowserAdvancedFieldsContext {
  setFields: React.Dispatch<React.SetStateAction<BrowserAdvancedFields>>;
  fields: BrowserAdvancedFields;
  defaultValues: BrowserAdvancedFields;
}

interface BrowserAdvancedFieldsContextProvider {
  children: React.ReactNode;
  defaultValues?: BrowserAdvancedFields;
}

export const initialValues: BrowserAdvancedFields = DEFAULT_BROWSER_ADVANCED_FIELDS;

const defaultContext: BrowserAdvancedFieldsContext = {
  setFields: (_fields: React.SetStateAction<BrowserAdvancedFields>) => {
    throw new Error(
      'setFields was not initialized for Browser Advanced Fields, set it when you invoke the context'
    );
  },
  fields: initialValues, // mutable
  defaultValues: initialValues, // immutable
};

export const BrowserAdvancedFieldsContext = createContext(defaultContext);

export const BrowserAdvancedFieldsContextProvider = ({
  children,
  defaultValues = initialValues,
}: BrowserAdvancedFieldsContextProvider) => {
  const [fields, setFields] = useState<BrowserAdvancedFields>(defaultValues);

  const value = useMemo(() => {
    return { fields, setFields, defaultValues };
  }, [fields, defaultValues]);

  return <BrowserAdvancedFieldsContext.Provider value={value} children={children} />;
};

export const useBrowserAdvancedFieldsContext = () => useContext(BrowserAdvancedFieldsContext);
