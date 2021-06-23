/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import v4 from 'uuid/v4';

import { schema } from '@kbn/config-schema';
import { Logger } from '@kbn/logging';

import { AlertServices } from '../../../../../alerting/server';
import {
  RuleDataClient,
  createPersistenceRuleTypeFactory,
} from '../../../../../rule_registry/server';
import { THRESHOLD_ALERT_TYPE_ID } from '../../../../common/constants';
import { SignalSearchResponse, ThresholdSignalHistory } from '../signals/types';
import {
  findThresholdSignals,
  getThresholdBucketFilters,
  getThresholdSignalHistory,
  transformThresholdResultsToEcs,
} from '../signals/threshold';
import { getFilter } from '../signals/get_filter';
import { BuildRuleMessage } from '../signals/rule_messages';

interface RuleParams {
  indexPatterns: string[];
  customQuery: string;
  thresholdFields: string[];
  thresholdValue: number;
  thresholdCardinality: Array<{
    field: string;
    value: number;
  }>;
}

interface BulkCreateThresholdSignalParams {
  results: SignalSearchResponse;
  ruleParams: RuleParams;
  services: AlertServices & { logger: Logger };
  inputIndexPattern: string[];
  ruleId: string;
  startedAt: Date;
  from: Date;
  thresholdSignalHistory: ThresholdSignalHistory;
  buildRuleMessage: BuildRuleMessage;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const formatThresholdSignals = (params: BulkCreateThresholdSignalParams): any[] => {
  const thresholdResults = params.results;
  const threshold = {
    field: params.ruleParams.thresholdFields,
    value: params.ruleParams.thresholdValue,
  };
  const results = transformThresholdResultsToEcs(
    thresholdResults,
    params.ruleParams.indexPatterns.join(','),
    params.startedAt,
    params.from,
    undefined,
    params.services.logger,
    threshold,
    params.ruleId,
    undefined,
    params.thresholdSignalHistory
  );
  return results.hits.hits.map((hit) => {
    return {
      ...hit,
      'event.kind': 'signal',
      'kibana.rac.alert.id': '???',
      'kibana.rac.alert.uuid': v4(),
      '@timestamp': new Date().toISOString(),
    };
  });
};

export const createThresholdAlertType = (ruleDataClient: RuleDataClient, logger: Logger) => {
  const createPersistenceRuleType = createPersistenceRuleTypeFactory({
    ruleDataClient,
    logger,
  });
  return createPersistenceRuleType({
    id: THRESHOLD_ALERT_TYPE_ID,
    name: 'Threshold Rule',
    validate: {
      params: schema.object({
        indexPatterns: schema.arrayOf(schema.string()),
        customQuery: schema.string(),
        thresholdFields: schema.arrayOf(schema.string()),
        thresholdValue: schema.number(),
        thresholdCardinality: schema.arrayOf(
          schema.object({
            field: schema.string(),
            value: schema.number(),
          })
        ),
      }),
    },
    actionGroups: [
      {
        id: 'default',
        name: 'Default',
      },
    ],
    defaultActionGroupId: 'default',
    actionVariables: {
      context: [{ name: 'server', description: 'the server' }],
    },
    minimumLicenseRequired: 'basic',
    producer: 'security-solution',
    async executor({ startedAt, services, params, alertId }) {
      const fromDate = moment(startedAt).subtract(moment.duration(5, 'm')); // hardcoded 5-minute rule interval
      const from = fromDate.toISOString();
      const to = startedAt.toISOString();

      // TODO: how to get the output index?
      const outputIndex = ['.kibana-madi-8-alerts-security-solution-8.0.0-000001'];
      const buildRuleMessage = (...messages: string[]) => messages.join();
      const timestampOverride = undefined;

      const {
        thresholdSignalHistory,
        searchErrors: previousSearchErrors,
      } = await getThresholdSignalHistory({
        indexPattern: outputIndex,
        from,
        to,
        services: (services as unknown) as AlertServices,
        logger,
        ruleId: alertId,
        bucketByFields: params.thresholdFields,
        timestampOverride,
        buildRuleMessage,
      });

      const bucketFilters = await getThresholdBucketFilters({
        thresholdSignalHistory,
        timestampOverride,
      });

      const esFilter = await getFilter({
        type: 'threshold',
        filters: bucketFilters,
        language: 'kuery',
        query: params.customQuery,
        savedId: undefined,
        services: (services as unknown) as AlertServices,
        index: params.indexPatterns,
        lists: [],
      });

      const {
        searchResult: thresholdResults,
        searchErrors,
        searchDuration: thresholdSearchDuration,
      } = await findThresholdSignals({
        inputIndexPattern: params.indexPatterns,
        from,
        to,
        services: (services as unknown) as AlertServices,
        logger,
        filter: esFilter,
        threshold: {
          field: params.thresholdFields,
          value: params.thresholdValue,
          cardinality: params.thresholdCardinality,
        },
        timestampOverride,
        buildRuleMessage,
      });

      logger.info(`Threshold search took ${thresholdSearchDuration}ms`); // TODO: rule status service

      const alerts = formatThresholdSignals({
        results: thresholdResults,
        ruleParams: params,
        services: (services as unknown) as AlertServices & { logger: Logger },
        inputIndexPattern: ['TODO'],
        ruleId: alertId,
        startedAt,
        from: fromDate.toDate(),
        thresholdSignalHistory,
        buildRuleMessage,
      });

      const errors = searchErrors.concat(previousSearchErrors);
      if (errors.length === 0) {
        services.alertWithPersistence(alerts).forEach((alert) => {
          alert.scheduleActions('default', { server: 'server-test' });
        });
      } else {
        throw new Error(errors.join('\n'));
      }

      return {
        lastChecked: new Date(),
      };
    },
  });
};
