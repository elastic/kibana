/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext } from 'react';
import { SecuritySolutionContext } from '../containers/security_solution_context';
import { SecuritySolutionPluginContext } from '../types';

export const useSecurityContext = (): SecuritySolutionPluginContext => {
  const contextValue = useContext(SecuritySolutionContext);

  if (!contextValue) {
    throw new Error(
      'SecuritySolutionContext can only be used within SecuritySolutionContext provider'
    );
  }

  return contextValue;
};
