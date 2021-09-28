/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo, useState } from 'react';
import { IBrowserAdvancedFields, ConfigKeys, ScreenshotOption } from '../types';

interface IBrowserAdvancedFieldsContext {
  setFields: React.Dispatch<React.SetStateAction<IBrowserAdvancedFields>>;
  fields: IBrowserAdvancedFields;
  defaultValues: IBrowserAdvancedFields;
}

interface IBrowserAdvancedFieldsContextProvider {
  children: React.ReactNode;
  defaultValues?: IBrowserAdvancedFields;
}

export const initialValues: IBrowserAdvancedFields = {
  [ConfigKeys.SCREENSHOTS]: ScreenshotOption.ON,
  [ConfigKeys.SYNTHETICS_ARGS]: [],
};

const defaultContext: IBrowserAdvancedFieldsContext = {
  setFields: (_fields: React.SetStateAction<IBrowserAdvancedFields>) => {
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
}: IBrowserAdvancedFieldsContextProvider) => {
  const [fields, setFields] = useState<IBrowserAdvancedFields>(defaultValues);

  const value = useMemo(() => {
    return { fields, setFields, defaultValues };
  }, [fields, defaultValues]);

  return <BrowserAdvancedFieldsContext.Provider value={value} children={children} />;
};

export const useBrowserAdvancedFieldsContext = () => useContext(BrowserAdvancedFieldsContext);
