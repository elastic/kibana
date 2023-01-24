/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo, useState } from 'react';
import { HTTPAdvancedFields } from '../types';
import { DEFAULT_HTTP_ADVANCED_FIELDS } from '../../../../../common/constants/monitor_defaults';

interface HTTPAdvancedFieldsContext {
  setFields: React.Dispatch<React.SetStateAction<HTTPAdvancedFields>>;
  fields: HTTPAdvancedFields;
  defaultValues: HTTPAdvancedFields;
}

interface HTTPAdvancedFieldsContextProvider {
  children: React.ReactNode;
  defaultValues?: HTTPAdvancedFields;
}

export const initialValues: HTTPAdvancedFields = DEFAULT_HTTP_ADVANCED_FIELDS;

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
