/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, createContext, useContext } from 'react';

export interface CloudServices {
  isCloudEnabled: boolean;
}

const ServicesContext = createContext<CloudServices>({ isCloudEnabled: false });

export const ServicesProvider: FC<CloudServices> = ({ children, ...services }) => (
  <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>
);

/**
 * React hook for accessing the pre-wired `CloudServices`.
 */
export function useServices() {
  return useContext(ServicesContext);
}
