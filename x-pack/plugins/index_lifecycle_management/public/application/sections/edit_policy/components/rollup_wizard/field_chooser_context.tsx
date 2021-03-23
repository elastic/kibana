/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, createContext, useContext, useState } from 'react';

interface ContextValue {
  indexPattern: string;
  updateIndexPattern: (value: string) => void;
}

const FieldChooserContext = createContext<ContextValue>({
  indexPattern: '',
  updateIndexPattern: () => {},
});

export const FieldChooserProvider: FunctionComponent = ({ children }) => {
  const [indexPattern, updateIndexPattern] = useState<string>('');
  return (
    <FieldChooserContext.Provider
      value={{
        indexPattern,
        updateIndexPattern,
      }}
    >
      {children}
    </FieldChooserContext.Provider>
  );
};

export const useFieldChooserContext = () => {
  const ctx = useContext(FieldChooserContext);
  if (!ctx) {
    throw new Error('"useFieldChooserContext" can only be used inside of a "FieldChooserProvider"');
  }
  return ctx;
};
