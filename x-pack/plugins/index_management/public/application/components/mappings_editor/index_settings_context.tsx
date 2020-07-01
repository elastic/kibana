/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { createContext, useContext } from 'react';
import { IndexSettings } from './types';

const IndexSettingsContext = createContext<IndexSettings | undefined>(undefined);

interface Props {
  indexSettings: IndexSettings | undefined;
  children: React.ReactNode;
}

export const IndexSettingsProvider = ({ indexSettings = {}, children }: Props) => (
  <IndexSettingsContext.Provider value={indexSettings}>{children}</IndexSettingsContext.Provider>
);

export const useIndexSettings = () => {
  const ctx = useContext(IndexSettingsContext);

  return ctx === undefined ? {} : ctx;
};
