/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { useSecurityContext } from '../hooks/use_security_context';

export const FiltersGlobal: FC = ({ children }) => {
  const contextValue = useSecurityContext();

  const Component = contextValue.getFiltersGlobalComponent();

  return <Component>{children}</Component>;
};
