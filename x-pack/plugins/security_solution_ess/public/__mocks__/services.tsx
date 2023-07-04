/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

export const KibanaServicesProvider = jest
  .fn()
  .mockImplementation(({ children }) => <div>{children}</div>);

export const useKibana = jest.fn().mockReturnValue({
  services: {
    http: {
      basePath: {
        prepend: jest.fn().mockImplementation((path: string) => path),
      },
    },
    cloudExperiments: {},
  },
});
