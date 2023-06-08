/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FleetServerAgentComponent,
  FleetServerAgentComponentUnit,
} from '../../../../../../../../common/types/models/agent';

import { createPackagePolicyMock } from '../../../../../../../../common/mocks';

import { getUnitsByPackage } from './input_status_utils';

describe('getUnitsByPackage', () => {
  const agentComponents: FleetServerAgentComponent[] = [
    {
      id: 'log-default',
      type: 'log',
      status: 'HEALTHY',
      message: 'Healthy',
      units: [
        {
          id: 'log-default-logfile-mypackage-123-456-789',
          type: 'input',
          message: 'Healthy',
          status: 'HEALTHY',
        },
        {
          id: 'log-default',
          type: 'output',
          message: 'Healthy',
          status: 'HEALTHY',
        },
      ],
    },
    {
      id: 'system/mypackage-default',
      type: 'mypackage/metrics',
      status: 'HEALTHY',
      message: 'Healthy',
      units: [
        {
          id: 'mypackage/metrics-default-mypackage/metrics-mypackage--123-456-789',
          type: 'input',
          message: 'failed to reload inputs',
          status: 'FAILED',
        },
        {
          id: 'mypackage/metrics-default',
          type: 'output',
          message: 'failed to reload inputs',
          status: 'FAILED',
        },
      ],
    },
    {
      id: 'filestream-monitoring',
      units: [
        {
          id: 'filestream-monitoring',
          type: 'output',
          message: 'Healthy',
          status: 'HEALTHY',
        },
        {
          id: 'filestream-monitoring-filestream-monitoring-agent',
          type: 'input',
          message: 'Healthy',
          status: 'HEALTHY',
        },
      ],
      type: 'filestream',
      message: 'Healthy',
      status: 'HEALTHY',
    },
  ];

  const packageMock = createPackagePolicyMock();
  packageMock.id = '123-456-789';
  packageMock.package!.name = 'mypackage';

  it('should return component units with an id that matches either the package policy id or package name', () => {
    expect(getUnitsByPackage(agentComponents, packageMock)).toEqual([
      {
        id: 'log-default-logfile-mypackage-123-456-789',
        type: 'input',
        message: 'Healthy',
        status: 'HEALTHY',
      },
      {
        id: 'mypackage/metrics-default-mypackage/metrics-mypackage--123-456-789',
        type: 'input',
        message: 'failed to reload inputs',
        status: 'FAILED',
      },
      {
        id: 'mypackage/metrics-default',
        type: 'output',
        message: 'failed to reload inputs',
        status: 'FAILED',
      },
    ] as FleetServerAgentComponentUnit[]);
  });
});
