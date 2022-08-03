/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunFn } from '@kbn/dev-cli-runner';
import { HORIZONTAL_LINE } from '../common/constants';
import { EmulatorRunContext } from './services/emulator_run_context';
import { AgentKeepAliveService } from './services/keep_alive';
import { ActionResponderService } from './services/action_responder';

export const DEFAULT_CHECKIN_INTERVAL = 60_000; // 1m
export const DEFAULT_ACTION_DELAY = 5_000; // 5s

export const agentEmulatorRunner: RunFn = async (cliContext) => {
  cliContext.log.write(`
${HORIZONTAL_LINE}
 Endpoint Agent Emulator
${HORIZONTAL_LINE}
`);

  const emulatorContext = new EmulatorRunContext(
    cliContext.flags.username as string,
    cliContext.flags.password as string,
    cliContext.flags.kibana as string,
    cliContext.flags.elastic as string,
    cliContext.flags.asSuperuser as boolean,
    cliContext.log
  );
  await emulatorContext.start();

  const actionDelay = Number(cliContext.flags.actionDelay) || DEFAULT_ACTION_DELAY;
  const checkinInterval = Number(cliContext.flags.checkinInterval) || DEFAULT_CHECKIN_INTERVAL;

  const esClient = emulatorContext.getEsClient();
  const kbnClient = emulatorContext.getKbnClient();
  const log = emulatorContext.getLogger();

  const keepAliveService = new AgentKeepAliveService(esClient, kbnClient, log, checkinInterval);
  keepAliveService.start();

  const actionResponderService = new ActionResponderService(
    esClient,
    kbnClient,
    log,
    5_000, // Check for actions every 5s
    actionDelay
  );
  actionResponderService.start();

  // TODO:PT check if any endpoints are loaded - if not, then load 5 now

  // TODO:PT Show Main menu

  await Promise.all([keepAliveService.whileRunning, actionResponderService.whileRunning]);

  cliContext.log.write(`
${HORIZONTAL_LINE}
`);
};
