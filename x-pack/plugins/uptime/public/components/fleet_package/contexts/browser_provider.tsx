/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { BrowserFields, BrowserSimpleFields, BrowserAdvancedFields } from '../types';
import {
  BrowserSimpleFieldsContextProvider,
  BrowserAdvancedFieldsContextProvider,
  defaultBrowserSimpleFields,
  defaultBrowserAdvancedFields,
} from '.';
import { formatDefaultValues } from '../helpers/context_helpers';

interface BrowserContextProviderProps {
  defaultValues?: BrowserFields;
  children: ReactNode;
}

export const BrowserContextProvider = ({
  defaultValues,
  children,
}: BrowserContextProviderProps) => {
  const simpleKeys = Object.keys(defaultBrowserSimpleFields) as Array<keyof BrowserSimpleFields>;
  const advancedKeys = Object.keys(defaultBrowserAdvancedFields) as Array<
    keyof BrowserAdvancedFields
  >;
  const formattedDefaultSimpleFields = formatDefaultValues<BrowserSimpleFields>(
    simpleKeys,
    defaultValues || {}
  );
  const formattedDefaultAdvancedFields = formatDefaultValues<BrowserAdvancedFields>(
    advancedKeys,
    defaultValues || {}
  );
  const simpleFields: BrowserSimpleFields | undefined = defaultValues
    ? formattedDefaultSimpleFields
    : undefined;
  const advancedFields: BrowserAdvancedFields | undefined = defaultValues
    ? formattedDefaultAdvancedFields
    : undefined;
  return (
    <BrowserAdvancedFieldsContextProvider defaultValues={advancedFields}>
      <BrowserSimpleFieldsContextProvider defaultValues={simpleFields}>
        {children}
      </BrowserSimpleFieldsContextProvider>
    </BrowserAdvancedFieldsContextProvider>
  );
};
