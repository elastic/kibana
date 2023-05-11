/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpStart } from '@kbn/core-http-browser';
import React, { useContext } from 'react';

export const ServerlessSearchContext = React.createContext<{ http: HttpStart } | undefined>(
  undefined
);

export const useServerlessSearchContext = () => {
  return useContext(ServerlessSearchContext);
};
