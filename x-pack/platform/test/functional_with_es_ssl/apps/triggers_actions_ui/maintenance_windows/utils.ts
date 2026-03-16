/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';

interface CreatedMaintenanceWindow {
  id: string;
  [key: string]: unknown;
}

interface MaintenanceWindowServices {
  supertest: SuperTest.Agent;
}

type GetMaintenanceWindowService = <TName extends keyof MaintenanceWindowServices>(
  name: TName
) => MaintenanceWindowServices[TName];

export const createMaintenanceWindow = async ({
  name,
  startDate,
  notRecurring,
  getService,
  overwrite,
}: {
  name: string;
  startDate?: Date;
  notRecurring?: boolean;
  getService: GetMaintenanceWindowService;
  overwrite?: Record<string, any>;
}): Promise<CreatedMaintenanceWindow> => {
  const supertest = getService('supertest');
  const dtstart = startDate ? startDate : new Date();
  const createParams = {
    title: name,
    duration: 60 * 60 * 1000,
    r_rule: {
      dtstart: dtstart.toISOString(),
      tzid: 'UTC',
      ...(notRecurring ? { freq: 1, count: 1 } : { freq: 2 }),
    },
    ...overwrite,
  };

  const { body } = await supertest
    .post(`/internal/alerting/rules/maintenance_window`)
    .set('kbn-xsrf', 'foo')
    .send(createParams)
    .expect(200);

  return body as CreatedMaintenanceWindow;
};
