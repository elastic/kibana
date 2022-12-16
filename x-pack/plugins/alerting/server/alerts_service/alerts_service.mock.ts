/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { AlertsService } from './alerts_service';

const creatAlertsServiceMock = () => {
  const mocked: jest.Mocked<PublicMethodsOf<AlertsService>> = {
    initialize: jest.fn(() => Promise.resolve()),
  };
  return mocked;
};

export const alertsServiceMock = {
  create: creatAlertsServiceMock,
};
