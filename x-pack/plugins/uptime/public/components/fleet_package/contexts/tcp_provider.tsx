/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { TCPFields, TCPSimpleFields, TCPAdvancedFields } from '../types';
import {
  TCPSimpleFieldsContextProvider,
  TCPAdvancedFieldsContextProvider,
  defaultTCPSimpleFields,
  defaultTCPAdvancedFields,
} from '.';
import { formatDefaultValues } from '../helpers/context_helpers';

interface TCPContextProviderProps {
  defaultValues?: TCPFields;
  children: ReactNode;
}

export const TCPContextProvider = ({ defaultValues, children }: TCPContextProviderProps) => {
  const simpleKeys = Object.keys(defaultTCPSimpleFields) as Array<keyof TCPSimpleFields>;
  const advancedKeys = Object.keys(defaultTCPAdvancedFields) as Array<keyof TCPAdvancedFields>;
  const formattedDefaultSimpleFields = formatDefaultValues<TCPSimpleFields>(
    simpleKeys,
    defaultValues || {}
  );
  const formattedDefaultAdvancedFields = formatDefaultValues<TCPAdvancedFields>(
    advancedKeys,
    defaultValues || {}
  );
  const simpleFields: TCPSimpleFields | undefined = defaultValues
    ? formattedDefaultSimpleFields
    : undefined;
  const advancedFields: TCPAdvancedFields | undefined = defaultValues
    ? formattedDefaultAdvancedFields
    : undefined;
  return (
    <TCPAdvancedFieldsContextProvider defaultValues={advancedFields}>
      <TCPSimpleFieldsContextProvider defaultValues={simpleFields}>
        {children}
      </TCPSimpleFieldsContextProvider>
    </TCPAdvancedFieldsContextProvider>
  );
};
