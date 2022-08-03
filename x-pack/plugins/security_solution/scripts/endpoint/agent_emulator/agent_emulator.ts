/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunFn } from '@kbn/dev-cli-runner';
import { HORIZONTAL_LINE } from '../common/constants';
import { EmulatorRunContext } from './services/emulator_run_context';

export const DEFAULT_CHECKIN_INTERVAL = 60_000; // 1m
export const DEFAULT_ACTION_DELAY = 5_000; // 5s

export const agentEmulatorRunner: RunFn = async (cliContext) => {
  cliContext.log.write(`
${HORIZONTAL_LINE}
 Endpoint Agent Emulator
${HORIZONTAL_LINE}
`);
  const actionResponseDelay = Number(cliContext.flags.actionDelay) || DEFAULT_ACTION_DELAY;
  const checkinInterval = Number(cliContext.flags.checkinInterval) || DEFAULT_CHECKIN_INTERVAL;

  const emulatorContext = new EmulatorRunContext({
    username: cliContext.flags.username as string,
    password: cliContext.flags.password as string,
    kibanaUrl: cliContext.flags.kibana as string,
    elasticUrl: cliContext.flags.elastic as string,
    asSuperuser: cliContext.flags.asSuperuser as boolean,
    log: cliContext.log,
    actionResponseDelay,
    checkinInterval,
  });
  await emulatorContext.start();

  // TODO:PT check if any endpoints are loaded - if not, then load 5 now

  // TODO:PT Show Main menu

  await emulatorContext.whileRunning;

  cliContext.log.write(`
${HORIZONTAL_LINE}
`);
};
