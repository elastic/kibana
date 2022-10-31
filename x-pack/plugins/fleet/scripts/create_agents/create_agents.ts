/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fetch from 'node-fetch';
import { ToolingLog } from '@kbn/tooling-log';
import uuid from 'uuid/v4';

const KIBANA_URL = 'http://localhost:5601';
const KIBANA_USERNAME = 'elastic';
const KIBANA_PASSWORD = 'changeme';

const ES_URL = 'http://localhost:9200';
const ES_SUPERUSER = 'fleet_superuser';
const ES_PASSWORD = 'password';

async function createAgentDocsBulk(policyId: string, count: number) {
  const auth = 'Basic ' + Buffer.from(ES_SUPERUSER + ':' + ES_PASSWORD).toString('base64');
  const body = (
    '{ "index":{ } }\n' +
    JSON.stringify({
      access_api_key_id: 'api-key-1',
      active: true,
      policy_id: policyId,
      type: 'PERMANENT',
      local_metadata: {
        elastic: {
          agent: {
            snapshot: false,
            upgradeable: true,
            version: '8.2.0',
          },
        },
        host: { hostname: uuid() },
      },
      user_provided_metadata: {},
      enrolled_at: new Date().toISOString(),
      last_checkin: new Date().toISOString(),
      tags: ['script_create_agents'],
    }) +
    '\n'
  ).repeat(count);
  const res = await fetch(`${ES_URL}/.fleet-agents/_bulk`, {
    method: 'post',
    body,
    headers: {
      Authorization: auth,
      'Content-Type': 'application/x-ndjson',
    },
  });
  const data = await res.json();
  return data;
}

async function createSuperUser() {
  const auth = 'Basic ' + Buffer.from(KIBANA_USERNAME + ':' + KIBANA_PASSWORD).toString('base64');
  const roleRes = await fetch(`${ES_URL}/_security/role/${ES_SUPERUSER}`, {
    method: 'post',
    body: JSON.stringify({
      indices: [
        {
          names: ['.fleet*'],
          privileges: ['all'],
          allow_restricted_indices: true,
        },
      ],
    }),
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
    },
  });
  const role = await roleRes.json();
  const userRes = await fetch(`${ES_URL}/_security/user/${ES_SUPERUSER}`, {
    method: 'post',
    body: JSON.stringify({
      password: ES_PASSWORD,
      roles: ['superuser', ES_SUPERUSER],
    }),
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
    },
  });
  const user = await userRes.json();
  return { role, user };
}

async function createAgentPolicy(id: string) {
  const auth = 'Basic ' + Buffer.from(KIBANA_USERNAME + ':' + KIBANA_PASSWORD).toString('base64');
  const res = await fetch(`${KIBANA_URL}/api/fleet/agent_policies`, {
    method: 'post',
    body: JSON.stringify({
      id,
      name: id,
      namespace: 'default',
      description: '',
      monitoring_enabled: ['logs'],
    }),
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
      'kbn-xsrf': 'kibana',
      'x-elastic-product-origin': 'fleet',
    },
  });
  const data = await res.json();
  return data;
}

/**
 * Script to create large number of agent documents at once.
 * This is helpful for testing agent bulk actions locally as the kibana async logic kicks in for >10k agents.
 */
export async function run() {
  const logger = new ToolingLog({
    level: 'info',
    writeTo: process.stdout,
  });

  logger.info('Creating agent policy');

  const agentPolicyId = uuid();
  const agentPolicy = await createAgentPolicy(agentPolicyId);
  logger.info(`Created agent policy ${agentPolicy.item.id}`);

  logger.info('Creating fleet superuser');
  const { role, user } = await createSuperUser();
  logger.info(`Created role ${ES_SUPERUSER}, created: ${role.role.created}`);
  logger.info(`Created user ${ES_SUPERUSER}, created: ${user.created}`);

  logger.info('Creating agent documents');
  const count = 50000;
  const agents = await createAgentDocsBulk(agentPolicyId, count);
  logger.info(
    `Created ${agents.items.length} agent docs, took ${agents.took}, errors: ${agents.errors}`
  );
}
