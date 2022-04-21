/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo, useState } from 'react';
import { ICMPSimpleFields, ConfigKey, DataStream } from '../types';
import { defaultValues as commonDefaultValues } from '../common/default_values';

interface ICMPSimpleFieldsContext {
  setFields: React.Dispatch<React.SetStateAction<ICMPSimpleFields>>;
  fields: ICMPSimpleFields;
  defaultValues: ICMPSimpleFields;
}

interface ICMPSimpleFieldsContextProvider {
  children: React.ReactNode;
  defaultValues?: ICMPSimpleFields;
}

export const initialValues: ICMPSimpleFields = {
  ...commonDefaultValues,
  [ConfigKey.HOSTS]: '',
  [ConfigKey.MONITOR_TYPE]: DataStream.ICMP,
  [ConfigKey.WAIT]: '1',
};

const defaultContext: ICMPSimpleFieldsContext = {
  setFields: (_fields: React.SetStateAction<ICMPSimpleFields>) => {
    throw new Error(
      'setFields was not initialized for ICMP Simple Fields, set it when you invoke the context'
    );
  },
  fields: initialValues, // mutable
  defaultValues: initialValues, // immutable
};

export const ICMPSimpleFieldsContext = createContext(defaultContext);

export const ICMPSimpleFieldsContextProvider = ({
  children,
  defaultValues = initialValues,
}: ICMPSimpleFieldsContextProvider) => {
  const [fields, setFields] = useState<ICMPSimpleFields>(defaultValues);

  const value = useMemo(() => {
    return { fields, setFields, defaultValues };
  }, [fields, defaultValues]);

  return <ICMPSimpleFieldsContext.Provider value={value} children={children} />;
};

export const useICMPSimpleFieldsContext = () => useContext(ICMPSimpleFieldsContext);
