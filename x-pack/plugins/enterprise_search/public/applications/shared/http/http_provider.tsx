/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { useActions } from 'kea';

import { HttpSetup } from 'src/core/public';

import { HttpLogic } from './http_logic';

interface IHttpProviderProps {
  http: HttpSetup;
  errorConnecting?: boolean;
}

export const HttpProvider: React.FC<IHttpProviderProps> = (props) => {
  const { initializeHttp, initializeHttpInterceptors } = useActions(HttpLogic);

  useEffect(() => {
    initializeHttp(props);
    initializeHttpInterceptors();
  }, []);

  return null;
};
