/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext } from 'react';
import { SecuritySolutionUserSettingsContext } from './context';

export const useSecuritySolutionUserSettings = () => {
  const userSettingsContext = useContext(SecuritySolutionUserSettingsContext);

  if (!userSettingsContext) {
    throw new Error('No Context found for SecuritySolution User Settings');
  }

  return userSettingsContext;
};
