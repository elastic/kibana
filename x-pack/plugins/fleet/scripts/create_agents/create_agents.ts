/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import fetch from 'node-fetch';
import { ToolingLog } from '@kbn/tooling-log';
import { v4 as uuidv4 } from 'uuid';
import yargs from 'yargs';

import type { AgentStatus } from '../../common';
import type { Agent } from '../../common';
const printUsage = () =>
  logger.info(`
    Create mock agent documents for testing fleet queries/UIs at scale.

    example usage: node scripts/create_agents --count 50 --statuses online,offline --kibana http://localhost:5601/mybase --delete

    [--status]: status to set agents to, defaults to online, use comma separated for multiple e.g. online,offline
                "count" number of agents will be created for each status
    [--delete]: delete all fake agents before creating new ones
    [--agentVersion]: Agent version, defaults to kibana version
    [--count]: number of agents to create, defaults to 50k
    [--kibana]: full url of kibana instance to create agents and policy in e.g http://localhost:5601/mybase, defaults to http://localhost:5601
    [--username]: username for kibana, defaults to elastic
    [--password]: password for kibana, defaults to changeme
`);

const DEFAULT_KIBANA_URL = 'http://localhost:5601';
const DEFAULT_KIBANA_USERNAME = 'elastic';
const DEFAULT_KIBANA_PASSWORD = 'changeme';

const DEFAULT_UNENROLL_TIMEOUT = 300; // 5 minutes
const ES_URL = 'http://localhost:9200';
const ES_SUPERUSER = 'fleet_superuser';
const ES_PASSWORD = 'password';

const DEFAULT_AGENT_COUNT = 50000;

const INDEX_BULK_OP = '{ "index":{ } }\n';

const {
  delete: deleteAgentsFirst = false,
  inactivityTimeout: inactivityTimeoutArg,
  status: statusArg = 'online',
  count: countArg,
  kibana: kibanaUrl = DEFAULT_KIBANA_URL,
  agentVersion: agentVersionArg,
  username: kbnUsername = DEFAULT_KIBANA_USERNAME,
  password: kbnPassword = DEFAULT_KIBANA_PASSWORD,
  // ignore yargs positional args, we only care about named args
  _,
  $0,
  ...otherArgs
} = yargs(process.argv.slice(2)).argv;

const statusesArg = (statusArg as string).split(',') as AgentStatus[];
const inactivityTimeout = inactivityTimeoutArg
  ? Number(inactivityTimeoutArg).valueOf()
  : DEFAULT_UNENROLL_TIMEOUT;
const count = countArg ? Number(countArg).valueOf() : DEFAULT_AGENT_COUNT;
const kbnAuth = 'Basic ' + Buffer.from(kbnUsername + ':' + kbnPassword).toString('base64');

const logger = new ToolingLog({
  level: 'info',
  writeTo: process.stdout,
});

function setAgentStatus(agent: any, status: AgentStatus) {
  switch (status) {
    case 'inactive':
      agent.last_checkin = new Date(new Date().getTime() - inactivityTimeout * 1000).toISOString();
      break;
    case 'enrolling':
      agent.last_checkin = null;
      break;
    case 'offline':
      agent.last_checkin = new Date(new Date().getTime() - 1000 * 60 * 5).toISOString();
      // half the time make the previous status error
      if (Math.random() > 0.5) {
        agent.last_checkin_status = 'ERROR';
      }
      break;
    case 'unenrolling':
      agent.unenrollment_started_at = new Date().toISOString();
      break;
    case 'unenrolled':
      agent.unenrolled_at = new Date().toISOString();
      agent.active = false;
      break;
    case 'error':
      agent.last_checkin_status = 'ERROR';
      break;
    case 'degraded':
      agent.last_checkin_status = 'DEGRADED';
      break;
    case 'updating':
      agent.policy_revision = null;
      agent.policy_revision_idx = null;
      break;
    case 'online':
      agent.last_checkin = new Date().toISOString();
      break;
    default:
      logger.warning(`Ignoring unknown status ${status}`);
  }

  // convert checkin status to lowercase 50% of the time as older agents use lowercase
  // we should handle both cases
  if (agent.last_checkin_status && Math.random() > 0.5) {
    agent.last_checkin_status = agent.last_checkin_status.toLowerCase();
  }

  return agent;
}

async function getKibanaVersion() {
  const response = await fetch(`${kibanaUrl}/api/status`, {
    headers: { Authorization: kbnAuth },
  });
  const { version } = await response.json();
  return version.number as string;
}

function createAgentWithStatus({
  policyId,
  status,
  version,
}: {
  policyId: string;
  status: AgentStatus;
  version: string;
}) {
  const baseAgent = {
    access_api_key_id: 'api-key-1',
    active: true,
    policy_id: policyId,
    type: 'PERMANENT',
    policy_revision_idx: 1,
    policy_revision: 1,
    local_metadata: {
      elastic: {
        agent: {
          snapshot: false,
          upgradeable: true,
          version,
        },
      },
      host: { hostname: uuid() },
    },
    user_provided_metadata: {},
    enrolled_at: new Date().toISOString(),
    last_checkin: new Date().toISOString(),
    tags: ['script_create_agents', status],
  };

  return setAgentStatus(baseAgent, status);
}

function createAgentsWithStatuses(
  statusMap: Partial<{ [status in AgentStatus]: number }>,
  policyId: string,
  version: string
) {
  // loop over statuses and create agents with that status
  const agents = [];
  // eslint-disable-next-line guard-for-in
  for (const currentStatus in statusMap) {
    const currentAgentStatus = currentStatus as AgentStatus;
    const statusCount = statusMap[currentAgentStatus] || 0;
    for (let i = 0; i < statusCount; i++) {
      agents.push(createAgentWithStatus({ policyId, status: currentAgentStatus, version }));
    }
  }

  return agents;
}

async function deleteAgents() {
  const auth = 'Basic ' + Buffer.from(ES_SUPERUSER + ':' + ES_PASSWORD).toString('base64');
  const res = await fetch(`${ES_URL}/.fleet-agents/_delete_by_query`, {
    method: 'post',
    body: JSON.stringify({
      query: {
        term: {
          tags: 'script_create_agents',
        },
      },
    }),
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
    },
  });
  const data = await res.json();
  return data;
}

async function createAgentDocsBulk(agents: Agent[]) {
  const auth = 'Basic ' + Buffer.from(ES_SUPERUSER + ':' + ES_PASSWORD).toString('base64');
  const body = agents.flatMap((agent) => [INDEX_BULK_OP, JSON.stringify(agent) + '\n']).join('');
  const res = await fetch(`${ES_URL}/.fleet-agents/_bulk`, {
    method: 'post',
    body,
    headers: {
      Authorization: auth,
      'Content-Type': 'application/x-ndjson',
    },
  });
  const data = await res.json();

  if (!data.items) {
    logger.error('Error creating agent docs: ' + JSON.stringify(data));
    process.exit(1);
  }
  return data;
}

async function createSuperUser() {
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
      Authorization: kbnAuth,
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
      Authorization: kbnAuth,
      'Content-Type': 'application/json',
    },
  });
  const user = await userRes.json();
  return { role, user };
}

async function createAgentPolicy(id: string) {
  const res = await fetch(`${kibanaUrl}/api/fleet/agent_policies`, {
    method: 'post',
    body: JSON.stringify({
      id,
      name: id,
      namespace: 'default',
      description: '',
      monitoring_enabled: ['logs'],
      inactivity_timeout: inactivityTimeout,
    }),
    headers: {
      Authorization: kbnAuth,
      'Content-Type': 'application/json',
      'kbn-xsrf': 'kibana',
      'x-elastic-product-origin': 'fleet',
    },
  });
  const data = await res.json();

  if (!data.item) {
    logger.error('Agent policy not created, API response: ' + JSON.stringify(data));
    process.exit(1);
  }
  return data;
}

function logStatusMap(statusMap: Partial<{ [status in AgentStatus]: number }>) {
  const statuses = Object.keys(statusMap);
  logger.info(
    `Creating ${Object.values(statusMap).reduce((a, b) => a + b, 0)} agents with statuses:`
  );

  if (statuses.length) {
    statuses.forEach((status) => {
      logger.info(`   ${status}: ${statusMap[status as AgentStatus]}`);
    });
  }
}

/**
 * Script to create large number of agent documents at once.
 * This is helpful for testing agent bulk actions locally as the kibana async logic kicks in for >10k agents.
 */
export async function run() {
  if (Object.keys(otherArgs).length) {
    logger.error(`Unknown arguments: ${Object.keys(otherArgs).join(', ')}`);
    printUsage();
    process.exit(0);
  }

  let agentVersion = agentVersionArg as string;
  if (!agentVersion) {
    logger.info('No agent version supplied, getting kibana version');
    agentVersion = await getKibanaVersion();
  }
  logger.info('Using agent version ' + agentVersion);

  if (deleteAgentsFirst) {
    logger.info('Deleting agents');
    const deleteRes = await deleteAgents();
    logger.info(`Deleted ${deleteRes.deleted} agents, took ${deleteRes.took}ms`);
  }

  logger.info('Creating agent policy');

  const agentPolicyId = 'script-create-agent-' + uuid();
  const agentPolicy = await createAgentPolicy(agentPolicyId);
  logger.info(`Created agent policy ${agentPolicy.item.id}`);

  logger.info('Creating fleet superuser');
  const { role, user } = await createSuperUser();
  logger.info(`Role "${ES_SUPERUSER}" ${role.role.created ? 'created' : 'already exists'}`);
  logger.info(`User "${ES_SUPERUSER}" ${user.created ? 'created' : 'already exists'}`);

  logger.info('Creating agent documents');
  const statusMap = statusesArg.reduce((acc, status) => ({ ...acc, [status]: count }), {});
  logStatusMap(statusMap);
  const agents = createAgentsWithStatuses(statusMap, agentPolicyId, agentVersion);
  const createRes = await createAgentDocsBulk(agents);
  logger.info(
    `Created ${createRes.items.length} agent docs, took ${createRes.took}, errors: ${createRes.errors}`
  );
}
