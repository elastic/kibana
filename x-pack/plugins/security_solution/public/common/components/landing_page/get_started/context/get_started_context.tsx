/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useKibana } from '../../../../lib/kibana';
import type { SecurityProductTypes } from '../configs';
import type { StepId } from '../types';

export interface GetStartedContextType {
  productTypes: SecurityProductTypes | undefined;
  projectsUrl: string | undefined;
  projectFeaturesUrl: string | undefined;
  availableSteps: StepId[];
}

const GetStartedContext = React.createContext<GetStartedContextType | null>(null);

export const GetStartedContextProvider: React.FC = ({ children }) => {
  const { productTypes, projectsUrl, projectFeaturesUrl, availableSteps } =
    useKibana().services.getStartedPageSettings();

  const value = {
    productTypes,
    projectsUrl,
    projectFeaturesUrl,
    availableSteps,
  };

  return <GetStartedContext.Provider value={value}>{children}</GetStartedContext.Provider>;
};

export const useGetStartedContext = () => {
  const context = React.useContext(GetStartedContext);
  if (!context) {
    throw new Error('useGetStartedContext must be used within a GetStartedContextProvider');
  }
  return context;
};
