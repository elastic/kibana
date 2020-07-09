/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NewPackageConfig } from './types/models/package_config';

export const createNewPackageConfigMock = () => {
  return {
    name: 'endpoint-1',
    description: '',
    namespace: 'default',
    enabled: true,
    config_id: '93c46720-c217-11ea-9906-b5b8a21b268e',
    output_id: '',
    package: {
      name: 'endpoint',
      title: 'Elastic Endpoint',
      version: '0.9.0',
    },
    inputs: [],
  } as NewPackageConfig;
};
