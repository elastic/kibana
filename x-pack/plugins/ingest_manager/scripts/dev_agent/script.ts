/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createFlagError, run, ToolingLog } from '@kbn/dev-utils';
import fetch from 'node-fetch';
import os from 'os';
import {
  Agent as _Agent,
  PostAgentCheckinRequest,
  PostAgentCheckinResponse,
  PostAgentEnrollRequest,
  PostAgentEnrollResponse,
} from '../../common/types';
import * as kibanaPackage from '../../package.json';

// @ts-ignore
// Using the ts-ignore because we are importing directly from a json to a script file
const version = kibanaPackage.version;
const CHECKIN_INTERVAL = 3000; // 3 seconds

type Agent = Pick<_Agent, 'id' | 'access_api_key'>;

let closing = false;

process.once('SIGINT', () => {
  closing = true;
});

run(
  async ({ flags, log }) => {
    if (!flags.kibanaUrl || typeof flags.kibanaUrl !== 'string') {
      throw createFlagError('please provide a single --path flag');
    }

    if (!flags.enrollmentApiKey || typeof flags.enrollmentApiKey !== 'string') {
      throw createFlagError('please provide a single --enrollmentApiKey flag');
    }
    const kibanaUrl = flags.kibanaUrl || 'http://localhost:5601';
    const agent = await enroll(kibanaUrl, flags.enrollmentApiKey, log);

    log.info('Enrolled with sucess', agent);

    while (!closing) {
      await checkin(kibanaUrl, agent, log);
      await new Promise((resolve, reject) => setTimeout(() => resolve(), CHECKIN_INTERVAL));
    }
  },
  {
    description: `
      Run a fleet development agent.
    `,
    flags: {
      string: ['kibanaUrl', 'enrollmentApiKey'],
      help: `
        --kibanaUrl kibanaURL to run the fleet agent
        --enrollmentApiKey enrollment api key
      `,
    },
  }
);

async function checkin(kibanaURL: string, agent: Agent, log: ToolingLog) {
  const body: PostAgentCheckinRequest['body'] = {
    events: [
      {
        type: 'STATE',
        subtype: 'RUNNING',
        message: 'state changed from STOPPED to RUNNING',
        timestamp: new Date().toISOString(),
        payload: {
          random: 'data',
          state: 'RUNNING',
          previous_state: 'STOPPED',
        },
        agent_id: agent.id,
      },
    ],
  };
  const res = await fetch(`${kibanaURL}/api/fleet/agents/${agent.id}/checkin`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'kbn-xsrf': 'xxx',
      Authorization: `ApiKey ${agent.access_api_key}`,
      'Content-Type': 'application/json',
    },
  });

  if (res.status === 403) {
    closing = true;
    log.info('Unenrolling agent');
    return;
  }

  const obj: PostAgentCheckinResponse = await res.json();
  log.info('checkin', obj);
}

async function enroll(kibanaURL: string, apiKey: string, log: ToolingLog): Promise<Agent> {
  const body: PostAgentEnrollRequest['body'] = {
    type: 'PERMANENT',
    metadata: {
      local: {
        host: 'localhost',
        ip: '127.0.0.1',
        system: `${os.type()} ${os.release()}`,
        memory: os.totalmem(),
        elastic: { agent: { version } },
      },
      user_provided: {
        dev_agent_version: '0.0.1',
        region: 'us-east',
      },
    },
  };
  const res = await fetch(`${kibanaURL}/api/fleet/agents/enroll`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'kbn-xsrf': 'xxx',
      Authorization: `ApiKey ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });
  const obj: PostAgentEnrollResponse = await res.json();

  if (!res.ok) {
    log.error(JSON.stringify(obj, null, 2));
    throw new Error('unable to enroll');
  }

  return {
    id: obj.item.id,
    access_api_key: obj.item.access_api_key,
  };
}
