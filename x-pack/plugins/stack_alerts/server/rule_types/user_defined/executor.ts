/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { executeUserDefinedCode } from '@kbn/alerting-plugin/server';
import fetch from 'node-fetch';
import { RuleExecutorOptions } from '../../types';
import { StackAlertType } from '../types';
import { ActionGroupId, Params } from './rule_type';

export async function executor(
  options: RuleExecutorOptions<Params, {}, {}, {}, typeof ActionGroupId, StackAlertType>
) {
  const { apiKey, services, params, logger, queryDelay } = options;
  const { alertsClient, shouldStopExecution } = services;

  if (!apiKey) {
    throw new Error(`User defined rule requires API key to run but none is provided`);
  }

  if (!alertsClient) {
    throw new Error(`Alerts client is not defined`);
  }

  const controller = new AbortController();
  let timeoutId: NodeJS.Timeout | null = null;
  async function checkTimeout() {
    timeoutId = null;

    if (shouldStopExecution()) {
      logger.info(`Aborting exec`);
      controller.abort();
    } else {
      // check again in 30 seconds
      timeoutId = setTimeout(checkTimeout, 30000);
    }
  }
  // Periodically check whether we should continue execution or abort the child
  checkTimeout();

  let userDefinedCode: string;
  const isUrl = params.isUrl;
  if (isUrl) {
    const response = await fetch(params.codeOrUrl);
    userDefinedCode = await response.text();
  } else {
    userDefinedCode = params.codeOrUrl;
  }

  const alertLimit = alertsClient.getAlertLimitValue();
  let hasReachedLimit = false;
  let cpuUsage: { p50: number; p95: number; p99: number } | undefined;
  let memoryUsage: { p50: number; p95: number; p99: number } | undefined;

  // Run code in child process
  try {
    const { stdout, ...result } = await executeUserDefinedCode({
      logger,
      userDefinedCode,
      env: {
        PATH: process.env.PATH,
        ELASTICSEARCH_API_KEY: apiKey,
        QUERY_DELAY_MS: queryDelay?.toString(),
      },
      abortController: controller,
    });

    if (stdout) {
      logger.info(`Info returned from user defined code ${stdout.split('\n')}`);
      const alertsToCreate: string[] = getDetectedAlerts(stdout);
      let alertCount = 0;
      for (const alertStr of alertsToCreate) {
        if (alertCount++ >= alertLimit) {
          hasReachedLimit = true;
          break;
        }
        try {
          const alert = JSON.parse(alertStr);
          alertsClient.report({
            id: alert.id,
            actionGroup: ActionGroupId,
            state: alert.state,
            context: alert.context,
          });
        } catch (e) {
          logger.warn(`Couldn't parse reported alert ${alertStr}`);
        }
      }

      const { getRecoveredAlerts } = alertsClient;
      for (const recoveredAlert of getRecoveredAlerts()) {
        const alertId = recoveredAlert.alert.getId();
        alertsClient?.setAlertData({
          id: alertId,
          context: {},
        });
      }
    }

    cpuUsage = result.cpuUsage;
    memoryUsage = result.memoryUsage;

    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    alertsClient.setAlertLimitReached(hasReachedLimit);
  } catch (error) {
    logger.error(`Error executing user-defined code - ${error.message}`);
    throw error;
  }

  return { state: {}, cpuUsage, memoryUsage };
}

const reportAlertLogPrefix = 'alertsClient:report:';
function getDetectedAlerts(output: string) {
  return output
    .split('\n')
    .filter((str) => str.indexOf(reportAlertLogPrefix) === 0)
    .map((str) => str.substring(reportAlertLogPrefix.length));
}
