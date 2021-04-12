/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApolloClient } from 'apollo-client';
import { createContext, useContext } from 'react';

/**
 * This is a temporary provider and hook for use with hooks until react-apollo
 * has upgraded to the new-style `createContext` api.
 */

export const ApolloClientContext = createContext<ApolloClient<{}> | undefined>(undefined);

export const useApolloClient = () => {
  return useContext(ApolloClientContext);
};
