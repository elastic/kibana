/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo, useState } from 'react';
import { HTTPAdvancedFields, ConfigKey, Mode, ResponseBodyIndexPolicy, HTTPMethod } from '../types';

interface HTTPAdvancedFieldsContext {
  setFields: React.Dispatch<React.SetStateAction<HTTPAdvancedFields>>;
  fields: HTTPAdvancedFields;
  defaultValues: HTTPAdvancedFields;
}

interface HTTPAdvancedFieldsContextProvider {
  children: React.ReactNode;
  defaultValues?: HTTPAdvancedFields;
}

export const initialValues: HTTPAdvancedFields = {
  [ConfigKey.PASSWORD]: '',
  [ConfigKey.PROXY_URL]: '',
  [ConfigKey.RESPONSE_BODY_CHECK_NEGATIVE]: [],
  [ConfigKey.RESPONSE_BODY_CHECK_POSITIVE]: [],
  [ConfigKey.RESPONSE_BODY_INDEX]: ResponseBodyIndexPolicy.ON_ERROR,
  [ConfigKey.RESPONSE_HEADERS_CHECK]: {},
  [ConfigKey.RESPONSE_HEADERS_INDEX]: true,
  [ConfigKey.RESPONSE_STATUS_CHECK]: [],
  [ConfigKey.REQUEST_BODY_CHECK]: {
    value: '',
    type: Mode.PLAINTEXT,
  },
  [ConfigKey.REQUEST_HEADERS_CHECK]: {},
  [ConfigKey.REQUEST_METHOD_CHECK]: HTTPMethod.GET,
  [ConfigKey.USERNAME]: '',
};

export const defaultContext: HTTPAdvancedFieldsContext = {
  setFields: (_fields: React.SetStateAction<HTTPAdvancedFields>) => {
    throw new Error('setFields was not initialized, set it when you invoke the context');
  },
  fields: initialValues,
  defaultValues: initialValues,
};

export const HTTPAdvancedFieldsContext = createContext(defaultContext);

export const HTTPAdvancedFieldsContextProvider = ({
  children,
  defaultValues = initialValues,
}: HTTPAdvancedFieldsContextProvider) => {
  const [fields, setFields] = useState<HTTPAdvancedFields>(defaultValues);

  const value = useMemo(() => {
    return { fields, setFields, defaultValues };
  }, [fields, defaultValues]);

  return <HTTPAdvancedFieldsContext.Provider value={value} children={children} />;
};

export const useHTTPAdvancedFieldsContext = () => useContext(HTTPAdvancedFieldsContext);
