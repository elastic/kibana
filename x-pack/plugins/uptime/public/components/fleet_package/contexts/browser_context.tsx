/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo, useState } from 'react';
import { IBrowserSimpleFields, ConfigKeys, DataStream } from '../types';
import { defaultValues as commonDefaultValues } from '../common/default_values';

interface IBrowserSimpleFieldsContext {
  setFields: React.Dispatch<React.SetStateAction<IBrowserSimpleFields>>;
  fields: IBrowserSimpleFields;
  defaultValues: IBrowserSimpleFields;
}

interface IBrowserSimpleFieldsContextProvider {
  children: React.ReactNode;
  defaultValues?: IBrowserSimpleFields;
}

export const initialValues: IBrowserSimpleFields = {
  ...commonDefaultValues,
  [ConfigKeys.MONITOR_TYPE]: DataStream.BROWSER,
  [ConfigKeys.SOURCE_ZIP_URL]: '',
  [ConfigKeys.SOURCE_ZIP_USERNAME]: '',
  [ConfigKeys.SOURCE_ZIP_PASSWORD]: '',
  [ConfigKeys.SOURCE_ZIP_FOLDER]: '',
  [ConfigKeys.SOURCE_INLINE]: '',
  [ConfigKeys.PARAMS]: '',
};

const defaultContext: IBrowserSimpleFieldsContext = {
  setFields: (_fields: React.SetStateAction<IBrowserSimpleFields>) => {
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
}: IBrowserSimpleFieldsContextProvider) => {
  const [fields, setFields] = useState<IBrowserSimpleFields>(defaultValues);

  const value = useMemo(() => {
    return { fields, setFields, defaultValues };
  }, [fields, defaultValues]);

  return <BrowserSimpleFieldsContext.Provider value={value} children={children} />;
};

export const useBrowserSimpleFieldsContext = () => useContext(BrowserSimpleFieldsContext);
