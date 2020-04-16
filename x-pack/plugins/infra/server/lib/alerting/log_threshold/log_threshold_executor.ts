/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { AlertExecutorOptions } from '../../../../../alerting/server';
import { AlertStates, Comparator, LogThresholdAlertParams } from './types';
import { InfraBackendLibs } from '../../infra_types';

const comparatorMap = {
  [Comparator.GT]: (a: number, b: number) => a > b,
  [Comparator.GT_OR_EQ]: (a: number, b: number) => a >= b,
};

export const createLogThresholdExecutor = (alertUUID: string, libs: InfraBackendLibs) =>
  async function({ services, params }: AlertExecutorOptions) {
    const { alertInstanceFactory, savedObjectsClient } = services;
    const { sources } = libs;
    const alertInstance = alertInstanceFactory(alertUUID);
    const { timeSize, timeUnit, count, criteria } = params as LogThresholdAlertParams;
    const interval = `${timeSize}${timeUnit}`;
    const sourceConfiguration = await sources.getSourceConfiguration(savedObjectsClient, 'default');
    const indexPattern = sourceConfiguration.configuration.logAlias;
    const shouldAlertFire = comparisonFunction(logCount, threshold);
    const isNoData = false; // Set this to true if there is no log data over the specified interval
    const isError = false; // Set this to true if Elasticsearch throws an error when fetching logs

    if (shouldAlertFire) {
      const sampleOutput = 'This is an example of data to send to an action context';

      alertInstance.scheduleActions(FIRED_ACTIONS.id, {
        sample: sampleOutput,
      });
    }
    // Future use: ability to fetch and display current alert state
    alertInstance.replaceState({
      alertState: isError
        ? AlertStates.ERROR
        : isNoData
        ? AlertStates.NO_DATA
        : shouldAlertFire
        ? AlertStates.ALERT
        : AlertStates.OK,
    });
  };

// When the Alerting plugin implements support for multiple action groups, add additional
// action groups here to send different messages, e.g. a recovery notification
export const FIRED_ACTIONS = {
  id: 'logs.threshold.fired',
  name: i18n.translate('xpack.infra.logs.alerting.threshold.fired', {
    defaultMessage: 'Fired',
  }),
};
