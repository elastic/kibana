/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo, useState } from 'react';
import { HTTPSimpleFields } from '../types';
import { DEFAULT_HTTP_SIMPLE_FIELDS } from '../../../../../common/constants/monitor_defaults';

interface HTTPSimpleFieldsContext {
  setFields: React.Dispatch<React.SetStateAction<HTTPSimpleFields>>;
  fields: HTTPSimpleFields;
  defaultValues: HTTPSimpleFields;
}

interface HTTPSimpleFieldsContextProvider {
  children: React.ReactNode;
  defaultValues?: HTTPSimpleFields;
}

export const initialValues: HTTPSimpleFields = DEFAULT_HTTP_SIMPLE_FIELDS;

const defaultContext: HTTPSimpleFieldsContext = {
  setFields: (_fields: React.SetStateAction<HTTPSimpleFields>) => {
    throw new Error(
      'setFields was not initialized for HTTP Simple Fields, set it when you invoke the context'
    );
  },
  fields: initialValues, // mutable
  defaultValues: initialValues, // immutable
};

export const HTTPSimpleFieldsContext = createContext(defaultContext);

export const HTTPSimpleFieldsContextProvider = ({
  children,
  defaultValues = initialValues,
}: HTTPSimpleFieldsContextProvider) => {
  const [fields, setFields] = useState<HTTPSimpleFields>(defaultValues);

  const value = useMemo(() => {
    return { fields, setFields, defaultValues };
  }, [fields, defaultValues]);

  return <HTTPSimpleFieldsContext.Provider value={value} children={children} />;
};

export const useHTTPSimpleFieldsContext = () => useContext(HTTPSimpleFieldsContext);
