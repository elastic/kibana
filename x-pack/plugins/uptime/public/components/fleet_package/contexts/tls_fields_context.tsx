/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo, useState } from 'react';
import { ITLSFields, ConfigKeys, TLSVersion, VerificationMode } from '../types';

interface ITLSFieldsContext {
  setFields: React.Dispatch<React.SetStateAction<ITLSFields>>;
  fields: ITLSFields;
  defaultValues: ITLSFields;
}

interface ITLSFieldsContextProvider {
  children: React.ReactNode;
  defaultValues?: ITLSFields;
}

export const initialValues: ITLSFields = {
  [ConfigKeys.TLS_CERTIFICATE_AUTHORITIES]: {
    value: '',
    isEnabled: false,
  },
  [ConfigKeys.TLS_CERTIFICATE]: {
    value: '',
    isEnabled: false,
  },
  [ConfigKeys.TLS_KEY]: {
    value: '',
    isEnabled: false,
  },
  [ConfigKeys.TLS_KEY_PASSPHRASE]: {
    value: '',
    isEnabled: false,
  },
  [ConfigKeys.TLS_VERIFICATION_MODE]: {
    value: VerificationMode.FULL,
    isEnabled: false,
  },
  [ConfigKeys.TLS_VERSION]: {
    value: [TLSVersion.ONE_ONE, TLSVersion.ONE_TWO, TLSVersion.ONE_THREE],
    isEnabled: false,
  },
};

const defaultContext: ITLSFieldsContext = {
  setFields: (_fields: React.SetStateAction<ITLSFields>) => {
    throw new Error('setFields was not initialized, set it when you invoke the context');
  },
  fields: initialValues, // mutable
  defaultValues: initialValues, // immutable
};

export const TLSFieldsContext = createContext(defaultContext);

export const TLSFieldsContextProvider = ({
  children,
  defaultValues = initialValues,
}: ITLSFieldsContextProvider) => {
  const [fields, setFields] = useState<ITLSFields>(defaultValues);

  const value = useMemo(() => {
    return { fields, setFields, defaultValues };
  }, [fields, defaultValues]);

  return <TLSFieldsContext.Provider value={value} children={children} />;
};

export const useTLSFieldsContext = () => useContext(TLSFieldsContext);
