/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Elasticsearch, Kibana } from '..';
import { callKibana } from './call_kibana';
import {
  customRoles,
  ObservabilityOnboardingCustomRolename,
} from '../authentication';

export async function createCustomRole({
  elasticsearch,
  kibana,
  roleName,
}: {
  elasticsearch: Elasticsearch;
  kibana: Kibana;
  roleName: ObservabilityOnboardingCustomRolename;
}) {
  const role = customRoles[roleName];

  await callKibana({
    elasticsearch,
    kibana,
    options: {
      method: 'PUT',
      url: `/api/security/role/${roleName}`,
      data: role,
    },
  });
}
