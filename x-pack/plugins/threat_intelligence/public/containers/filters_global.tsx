/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FC, useContext } from 'react';
import { SecuritySolutionContext } from './security_solution_context';

export const FiltersGlobal: FC = ({ children }) => {
  const contextValue = useContext(SecuritySolutionContext);

  if (!contextValue) {
    throw new Error('FiltersGlobal can only be used within Security Solution Context');
  }

  const Component = contextValue.getFiltersGlobalComponent();

  return <Component>{children}</Component>;
};
