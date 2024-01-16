/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { GetStartedContextProvider } from './context/get_started_context';
import { GetStarted } from './get_started';

interface GetStartedContextProviderProps {
  indicesExist?: boolean;
}

const GetStartedWithContextComponent: React.FC<GetStartedContextProviderProps> = ({
  indicesExist,
}) => {
  return (
    <GetStartedContextProvider>
      <GetStarted indicesExist={indicesExist} />
    </GetStartedContextProvider>
  );
};

export const GetStartedWithContext = React.memo(GetStartedWithContextComponent);

// eslint-disable-next-line import/no-default-export
export default GetStartedWithContext;
