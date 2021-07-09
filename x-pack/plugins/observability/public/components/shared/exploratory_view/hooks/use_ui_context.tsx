/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  createContext,
  useContext,
  Context,
  useState,
  Dispatch,
  SetStateAction,
} from 'react';

export interface IIndexPatternContext {
  dateRangeInFocus: string;
  superDatePickerInFocus: string;
  setDateRangeInFocus: Dispatch<SetStateAction<string>>;
  setSuperDatePickerInFocus: Dispatch<SetStateAction<string>>;
}

export const UIContext = createContext<Partial<IIndexPatternContext>>({});

interface ProviderProps {
  children: JSX.Element;
}

export function UIContextProvider({ children }: ProviderProps) {
  const [dateRangeInFocus, setDateRangeInFocus] = useState('');
  const [superDatePickerInFocus, setSuperDatePickerInFocus] = useState('');

  return (
    <UIContext.Provider
      value={{
        dateRangeInFocus,
        setDateRangeInFocus,
        superDatePickerInFocus,
        setSuperDatePickerInFocus,
      }}
    >
      {children}
    </UIContext.Provider>
  );
}

export const useUIContext = () => {
  return useContext((UIContext as unknown) as Context<IIndexPatternContext>);
};
