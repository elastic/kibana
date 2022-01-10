/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fetch from 'node-fetch';
import pMap from 'p-map';

import { FleetClient } from './fleet_client';

const SO_SEARCH_LIMIT = 10000;

const range = (n) => Array.from(Array(n).keys());

export const cli = async () => {
  const kibanaUrl = 'http://localhost:5601';
  const kibanaUsername = 'elastic';
  const kibanaPassword = 'changeme';

  const fleetClient = new FleetClient(kibanaUrl, kibanaUsername, kibanaPassword);

  await pMap(range(5000), (i) => createPolicyIfDoesNotExists(fleetClient, `Test policy ${i}`), {
    concurrency: 50,
  });
};

async function createPolicyIfDoesNotExists(fleetClient: FleetClient, name: string) {
  const res = await fleetClient.getPolicies(
    1,
    SO_SEARCH_LIMIT,
    `ingest-agent-policies.name:"${name}"`
  );
  const existingPolicy = res.items.find((policy: any) => policy.name === name);
  if (existingPolicy) {
    return existingPolicy;
  }

  const createRes = await fleetClient.postPolicies({
    name,
    namespace: 'default',
    description: 'Test data lorem ipsum',
  });

  return createRes.item;
}
