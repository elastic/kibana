/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { faker } from '@faker-js/faker';
import {
  ENTITY_DISPLAY_NAME,
  ENTITY_TYPE,
  ENTITY_ID,
  ENTITY_LAST_SEEN,
  AGENT_NAME,
  CLOUD_PROVIDER,
} from '@kbn/observability-shared-plugin/common';
import { Entity } from '../../../../common/entities';

const idGenerator = () => {
  let id = 0;
  return () => (++id).toString();
};

const generateId = idGenerator();

function generateRandomTimestamp() {
  const end = new Date();
  const start = new Date(end);

  start.setHours(start.getHours() - 24);
  const randomDate = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

  return randomDate.toISOString();
}

const getEntity = (entityType: string, customFields: Record<string, any> = {}) => ({
  [ENTITY_LAST_SEEN]: generateRandomTimestamp(),
  [ENTITY_TYPE]: entityType,
  [ENTITY_DISPLAY_NAME]: faker.person.fullName(),
  [ENTITY_ID]: generateId(),
  ...customFields,
});

const alertsMock = [
  {
    ...getEntity('host'),
    alertsCount: 3,
  },
  {
    ...getEntity('service'),
    alertsCount: 3,
  },

  {
    ...getEntity('host'),
    alertsCount: 10,
  },
  {
    ...getEntity('host'),
    alertsCount: 1,
  },
];

const hostsMock = Array.from({ length: 20 }, () => getEntity('host', { [CLOUD_PROVIDER]: 'gcp' }));
const containersMock = Array.from({ length: 20 }, () => getEntity('container'));
const servicesMock = Array.from({ length: 20 }, () =>
  getEntity('service', { [AGENT_NAME]: 'java' })
);

export const entitiesMock = [
  ...alertsMock,
  ...hostsMock,
  ...containersMock,
  ...servicesMock,
] as Entity[];
