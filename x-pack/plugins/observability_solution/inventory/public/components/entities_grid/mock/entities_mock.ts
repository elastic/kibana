/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { faker } from '@faker-js/faker';
import type { EntityLatest } from '../../../../common/entities';

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

const indentityFieldsPerType: Record<string, string[]> = {
  host: ['host.name'],
  container: ['container.id'],
  service: ['service.name'],
};

const getEntityLatest = (entityType: string, overrides?: Partial<EntityLatest>): EntityLatest => ({
  entity: {
    last_seen_timestamp: generateRandomTimestamp(),
    type: entityType,
    display_name: faker.person.fullName(),
    id: generateId(),
    definition_id: faker.string.uuid(),
    definition_version: '1.0.0',
    identity_fields: indentityFieldsPerType[entityType],
    schema_version: '1.0.0',
    ...(overrides?.entity ? overrides.entity : undefined),
  },
  ...((overrides ? overrides : {}) as Record<string, unknown>),
});

const alertsMock: EntityLatest[] = [
  getEntityLatest('host', {
    alertsCount: 1,
  }),
  getEntityLatest('service', {
    alertsCount: 3,
  }),
  getEntityLatest('host', {
    alertsCount: 10,
  }),
  getEntityLatest('host', {
    alertsCount: 1,
  }),
];

const hostsMock = Array.from({ length: 20 }, () =>
  getEntityLatest('host', { cloud: { provider: 'gcp' } })
);
const containersMock = Array.from({ length: 20 }, () => getEntityLatest('container'));
const servicesMock = Array.from({ length: 20 }, () =>
  getEntityLatest('service', { agent: { name: 'java' } })
);

export const entitiesMock = [
  ...alertsMock,
  ...hostsMock,
  ...containersMock,
  ...servicesMock,
] as EntityLatest[];
