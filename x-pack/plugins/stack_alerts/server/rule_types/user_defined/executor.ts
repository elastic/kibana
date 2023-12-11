/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { exec } from 'child_process';
import fs from 'fs';
import { RuleExecutorOptions } from '../../types';
import { StackAlertType } from '../types';
import { ActionGroupId, Params } from './rule_type';

export async function executor(
  options: RuleExecutorOptions<Params, {}, {}, {}, typeof ActionGroupId, StackAlertType>
) {
  const {
    rule: { id: ruleId, name },
    apiKey,
    services,
    params,
    logger,
    getTimeRange,
  } = options;
  const { alertsClient } = services;

  const userDefinedCode = params.stringifiedUserCode;
  // Wrap customCode with our own code file to provide utilities
  const wrappedCode = wrapUserDefinedCode(userDefinedCode);

  if (!apiKey) {
    throw new Error(`User defined rule requires API key to run but none is provided`);
  }

  // Run code in child process
  exec(
    `cat <<'EOF' | deno run --allow-net=127.0.0.1:9200 --allow-env --allow-sys - \n${wrappedCode}\nEOF`,
    {
      cwd: __dirname,
      env: {
        PATH: process.env.PATH,
        DENO_NO_PROMPT: 1,
        ELASTICSEARCH_API_KEY: apiKey,
      },
    },
    (error, stdout, stderr) => {
      if (error) {
        console.log('ERROR:', error);
      }
      if (stderr) {
        console.log('STDERR:', stderr);
      }

      console.log('STDOUT:', stdout.split('\n'));
      console.log('Alerts to create', getDetectedAlerts(stdout));
    }
  );

  return { state: {} };
}

function wrapUserDefinedCode(code: string) {
  const template = fs.readFileSync(`${__dirname}/child_process_template.tplt`, 'utf8');
  return template.replace(
    '// INJECT CODE HERE',
    code
      .split('\n')
      .map((s) => `    ${s}`)
      .join('\n')
  );
}

function getDetectedAlerts(output: string) {
  return output
    .split('\n')
    .filter((str) => str.indexOf('createAlert:') === 0)
    .map((str) => str.substring(12));
}
