/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo, useState } from 'react';
import {
  IHTTPAdvancedFields,
  ConfigKeys,
  Mode,
  ResponseBodyIndexPolicy,
  HTTPMethod,
} from '../types';

interface IHTTPAdvancedFieldsContext {
  setFields: React.Dispatch<React.SetStateAction<IHTTPAdvancedFields>>;
  fields: IHTTPAdvancedFields;
  defaultValues: IHTTPAdvancedFields;
}

interface IHTTPAdvancedFieldsContextProvider {
  children: React.ReactNode;
  defaultValues?: IHTTPAdvancedFields;
}

export const initialValues: IHTTPAdvancedFields = {
  [ConfigKeys.PASSWORD]: '',
  [ConfigKeys.PROXY_URL]: '',
  [ConfigKeys.RESPONSE_BODY_CHECK_NEGATIVE]: [],
  [ConfigKeys.RESPONSE_BODY_CHECK_POSITIVE]: [],
  [ConfigKeys.RESPONSE_BODY_INDEX]: ResponseBodyIndexPolicy.ON_ERROR,
  [ConfigKeys.RESPONSE_HEADERS_CHECK]: {},
  [ConfigKeys.RESPONSE_HEADERS_INDEX]: true,
  [ConfigKeys.RESPONSE_STATUS_CHECK]: [],
  [ConfigKeys.REQUEST_BODY_CHECK]: {
    value: '',
    type: Mode.PLAINTEXT,
  },
  [ConfigKeys.REQUEST_HEADERS_CHECK]: {},
  [ConfigKeys.REQUEST_METHOD_CHECK]: HTTPMethod.GET,
  [ConfigKeys.USERNAME]: '',
};

export const defaultContext: IHTTPAdvancedFieldsContext = {
  setFields: (_fields: React.SetStateAction<IHTTPAdvancedFields>) => {
    throw new Error('setFields was not initialized, set it when you invoke the context');
  },
  fields: initialValues,
  defaultValues: initialValues,
};

export const HTTPAdvancedFieldsContext = createContext(defaultContext);

export const HTTPAdvancedFieldsContextProvider = ({
  children,
  defaultValues = initialValues,
}: IHTTPAdvancedFieldsContextProvider) => {
  const [fields, setFields] = useState<IHTTPAdvancedFields>(defaultValues);

  const value = useMemo(() => {
    return { fields, setFields, defaultValues };
  }, [fields, defaultValues]);

  return <HTTPAdvancedFieldsContext.Provider value={value} children={children} />;
};

export const useHTTPAdvancedFieldsContext = () => useContext(HTTPAdvancedFieldsContext);
