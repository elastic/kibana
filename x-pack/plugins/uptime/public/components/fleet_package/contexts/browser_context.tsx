/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo, useState } from 'react';
import { BrowserSimpleFields, ConfigKey, DataStream, ScheduleUnit } from '../types';
import { defaultValues as commonDefaultValues } from '../common/default_values';

interface BrowserSimpleFieldsContext {
  setFields: React.Dispatch<React.SetStateAction<BrowserSimpleFields>>;
  fields: BrowserSimpleFields;
  defaultValues: BrowserSimpleFields;
}

interface BrowserSimpleFieldsContextProvider {
  children: React.ReactNode;
  defaultValues?: BrowserSimpleFields;
}

export const initialValues: BrowserSimpleFields = {
  ...commonDefaultValues,
  [ConfigKey.SCHEDULE]: {
    unit: ScheduleUnit.MINUTES,
    number: '10',
  },
  [ConfigKey.METADATA]: {
    script_source: {
      is_generated_script: false,
      file_name: '',
    },
    is_zip_url_tls_enabled: false,
  },
  [ConfigKey.MONITOR_TYPE]: DataStream.BROWSER,
  [ConfigKey.SOURCE_ZIP_URL]: '',
  [ConfigKey.SOURCE_ZIP_USERNAME]: '',
  [ConfigKey.SOURCE_ZIP_PASSWORD]: '',
  [ConfigKey.SOURCE_ZIP_FOLDER]: '',
  [ConfigKey.SOURCE_ZIP_PROXY_URL]: '',
  [ConfigKey.SOURCE_INLINE]: '',
  [ConfigKey.PARAMS]: '',
  [ConfigKey.ZIP_URL_TLS_CERTIFICATE_AUTHORITIES]: undefined,
  [ConfigKey.ZIP_URL_TLS_CERTIFICATE]: undefined,
  [ConfigKey.ZIP_URL_TLS_KEY]: undefined,
  [ConfigKey.ZIP_URL_TLS_KEY_PASSPHRASE]: undefined,
  [ConfigKey.ZIP_URL_TLS_VERIFICATION_MODE]: undefined,
  [ConfigKey.ZIP_URL_TLS_VERSION]: undefined,
  [ConfigKey.URLS]: undefined,
  [ConfigKey.PORT]: undefined,
};

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
