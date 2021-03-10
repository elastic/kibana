/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, Context } from 'react';
import { IKbnUrlStateStorage } from '../../../../../../../../src/plugins/kibana_utils/public';

export const UrlStorageContext = createContext<IKbnUrlStateStorage | null>(null);

interface ProviderProps {
  storage: IKbnUrlStateStorage;
}

export const UrlStorageContextProvider: React.FC<ProviderProps> = ({ children, storage }) => {
  return <UrlStorageContext.Provider value={storage}>{children}</UrlStorageContext.Provider>;
};

export const useUrlStorage = () =>
  useContext((UrlStorageContext as unknown) as Context<IKbnUrlStateStorage>);
