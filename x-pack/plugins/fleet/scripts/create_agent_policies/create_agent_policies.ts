/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import yargs from 'yargs';
import { chunk } from 'lodash';

import { LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../common/constants';
import { LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE } from '../../common';

import { packagePolicyFixture } from './fixtures';

const logger = new ToolingLog({
  level: 'info',
  writeTo: process.stdout,
});

const ES_URL = 'http://localhost:9200';
const ES_SUPERUSER = 'system_indices_superuser';
const ES_PASSWORD = 'changeme';

const printUsage = () =>
  logger.info(`
    Create mocked agent policies to test Fleet UI at scale
`);

const INDEX_BULK_OP = '{ "index":{ "_id": "{{id}}" } }\n';

function getPolicyId(idx: number | string) {
  return `test-policy-${idx}`;
}

async function createAgentPoliciesDocsBulk(range: number[]) {
  const auth = 'Basic ' + Buffer.from(ES_SUPERUSER + ':' + ES_PASSWORD).toString('base64');
  const body = range
    .flatMap((idx) => [
      INDEX_BULK_OP.replace(
        /{{id}}/,
        `${LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE}:${getPolicyId(idx)}`
      ),
      JSON.stringify({
        [LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE]: {
          namespace: 'default',
          monitoring_enabled: ['logs', 'metrics', 'traces'],
          name: `Test Policy ${idx}`,
          description: 'test policy',
          is_default: false,
          is_default_fleet_server: false,
          inactivity_timeout: 1209600,
          is_preconfigured: false,
          status: 'active',
          is_managed: false,
          revision: 2,
          updated_at: new Date().toISOString(),
          updated_by: 'system',
          schema_version: '1.1.1',
          is_protected: false,
        },
        type: LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE,
        references: [],
        managed: false,
        coreMigrationVersion: '8.8.0',
        typeMigrationVersion: '10.3.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }) + '\n',
    ])
    .join('');
  const res = await fetch(`${ES_URL}/.kibana_ingest/_bulk`, {
    method: 'post',
    body,
    headers: {
      Authorization: auth,
      'Content-Type': 'application/x-ndjson',
    },
  });
  const data = await res.json();

  if (!data.items) {
    logger.error('Error creating agent policies docs: ' + JSON.stringify(data));
    process.exit(1);
  }
  return data;
}

async function createEnrollmentToken(range: number[]) {
  const auth = 'Basic ' + Buffer.from(ES_SUPERUSER + ':' + ES_PASSWORD).toString('base64');
  const body = range
    .flatMap((idx) => [
      INDEX_BULK_OP.replace(/{{id}}/, `test-enrollment-token-${idx}`),
      JSON.stringify({
        active: true,
        api_key_id: 'faketest123',
        api_key: 'test==',
        name: `Test Policy ${idx}`,
        policy_id: `${getPolicyId(idx)}`,
        namespaces: [],
        created_at: new Date().toISOString(),
      }) + '\n',
    ])
    .join('');

  const res = await fetch(`${ES_URL}/.fleet-enrollment-api-keys/_bulk`, {
    method: 'post',
    body,
    headers: {
      Authorization: auth,
      'Content-Type': 'application/x-ndjson',
    },
  });
  const data = await res.json();

  if (!data.items) {
    logger.error('Error creating agent policies docs: ' + JSON.stringify(data));
    process.exit(1);
  }
  return data;
}

async function createPackagePolicies(range: number[]) {
  const auth = 'Basic ' + Buffer.from(ES_SUPERUSER + ':' + ES_PASSWORD).toString('base64');
  const body = range
    .flatMap((idx) => [
      INDEX_BULK_OP.replace(
        /{{id}}/,
        `${LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE}:test-policy-${idx}`
      ),
      JSON.stringify(
        packagePolicyFixture({
          idx,
          agentPolicyId: getPolicyId(idx),
        })
      ) + '\n',
    ])
    .join('');

  const res = await fetch(`${ES_URL}/.kibana_ingest/_bulk`, {
    method: 'post',
    body,
    headers: {
      Authorization: auth,
      'Content-Type': 'application/x-ndjson',
    },
  });

  const data = await res.json();

  if (!data.items) {
    logger.error('Error creating agent policies docs: ' + JSON.stringify(data));
    process.exit(1);
  }
  return data;
}

export async function run() {
  const {
    size: sizeArg = 500,
    // ignore yargs positional args, we only care about named args
    _,
    $0,
    ...otherArgs
  } = yargs(process.argv.slice(2)).argv;
  if (Object.keys(otherArgs).length) {
    logger.error(`Unknown arguments: ${Object.keys(otherArgs).join(', ')}`);
    printUsage();
    process.exit(0);
  }

  const size = Number(sizeArg).valueOf();
  logger.info(`Creating ${size} policies`);

  const range = Array.from({ length: size }, (_ignore, index) => index + 1);

  for (const rangePart of chunk(range, 200)) {
    await Promise.all([
      createAgentPoliciesDocsBulk(rangePart),
      createEnrollmentToken(rangePart),
      createPackagePolicies(rangePart),
    ]);
  }
  logger.info(`Succesfuly created ${size} policies`);
}
