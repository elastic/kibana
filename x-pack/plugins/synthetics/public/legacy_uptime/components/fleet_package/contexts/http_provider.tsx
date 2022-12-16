/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { HTTPFields, HTTPSimpleFields, HTTPAdvancedFields } from '../types';
import {
  HTTPSimpleFieldsContextProvider,
  HTTPAdvancedFieldsContextProvider,
  defaultHTTPSimpleFields,
  defaultHTTPAdvancedFields,
} from '.';
import { formatDefaultValues } from '../helpers/context_helpers';

interface HTTPContextProviderProps {
  defaultValues?: HTTPFields;
  children: ReactNode;
}

export const HTTPContextProvider = ({ defaultValues, children }: HTTPContextProviderProps) => {
  const simpleKeys = Object.keys(defaultHTTPSimpleFields) as Array<keyof HTTPSimpleFields>;
  const advancedKeys = Object.keys(defaultHTTPAdvancedFields) as Array<keyof HTTPAdvancedFields>;
  const formattedDefaultHTTPSimpleFields = formatDefaultValues<HTTPSimpleFields>(
    simpleKeys,
    defaultValues || {}
  );
  const formattedDefaultHTTPAdvancedFields = formatDefaultValues<HTTPAdvancedFields>(
    advancedKeys,
    defaultValues || {}
  );
  const httpAdvancedFields = defaultValues ? formattedDefaultHTTPAdvancedFields : undefined;
  const httpSimpleFields: HTTPSimpleFields | undefined = defaultValues
    ? formattedDefaultHTTPSimpleFields
    : undefined;
  return (
    <HTTPAdvancedFieldsContextProvider defaultValues={httpAdvancedFields}>
      <HTTPSimpleFieldsContextProvider defaultValues={httpSimpleFields}>
        {children}
      </HTTPSimpleFieldsContextProvider>
    </HTTPAdvancedFieldsContextProvider>
  );
};
