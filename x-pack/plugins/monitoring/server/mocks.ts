/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ILicense } from '@kbn/licensing-plugin/server';
import { Subject } from 'rxjs';
import { MonitoringLicenseService } from './types';

const createLicenseServiceMock = (): jest.Mocked<MonitoringLicenseService> => ({
  refresh: jest.fn(),
  license$: new Subject<ILicense>(),
  getMessage: jest.fn(),
  getWatcherFeature: jest.fn(),
  getMonitoringFeature: jest.fn(),
  getSecurityFeature: jest.fn(),
  stop: jest.fn(),
});

// this might be incomplete and is added to as needed
export const monitoringPluginMock = {
  createLicenseServiceMock,
};
