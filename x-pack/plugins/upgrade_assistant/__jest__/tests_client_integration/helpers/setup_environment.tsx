/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import axios from 'axios';

import { docLinksServiceMock } from '../../../../../../src/core/public/mocks';
import { HttpSetup } from '../../../../../../src/core/public';

import { mockKibanaSemverVersion, UA_READONLY_MODE } from '../../../common/constants';
import { AppContextProvider } from '../../../public/application/app_context';

const mockHttpClient = axios.create();

const contextValue = {
  http: (mockHttpClient as unknown) as HttpSetup,
  isCloudEnabled: false,
  docLinks: docLinksServiceMock.createStartContract(),
  kibanaVersionInfo: {
    currentMajor: mockKibanaSemverVersion.major,
    prevMajor: mockKibanaSemverVersion.major - 1,
    nextMajor: mockKibanaSemverVersion.major + 1,
  },
  isReadOnlyMode: UA_READONLY_MODE,
};

export const WithAppDependencies = (Comp: any, overrides: any = {}) => (props: any) => {
  return (
    <AppContextProvider value={{ ...contextValue, ...overrides }}>
      <Comp {...props} />
    </AppContextProvider>
  );
};
