/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import v4 from 'uuid/v4';

import { Logger } from '@kbn/logging';
import { validateNonExact } from '@kbn/securitysolution-io-ts-utils';

import { AlertServices } from '../../../../../alerting/server';
import { RuleDataClient } from '../../../../../rule_registry/server';
import { THRESHOLD_ALERT_TYPE_ID } from '../../../../common/constants';
import { SetupPlugins } from '../../../../target/types/server/plugin';
import { thresholdRuleParams, ThresholdRuleParams } from '../schemas/rule_schemas';
import { SignalSearchResponse, ThresholdSignalHistory } from '../signals/types';
import {
  findThresholdSignals,
  getThresholdBucketFilters,
  getThresholdSignalHistory,
  transformThresholdResultsToEcs,
} from '../signals/threshold';
import { getFilter } from '../signals/get_filter';
import { BuildRuleMessage } from '../signals/rule_messages';
import { createSecurityRuleTypeFactory } from './create_security_rule_type_factory';

/*
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
*/

interface BulkCreateThresholdSignalParams {
  results: SignalSearchResponse;
  ruleParams: ThresholdRuleParams;
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
  const { index, threshold } = params.ruleParams;
  const thresholdResults = params.results;
  const results = transformThresholdResultsToEcs(
    thresholdResults,
    (index ?? []).join(','),
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

export const createThresholdAlertType = (createOptions: {
  lists: SetupPlugins['lists'];
  logger: Logger;
  ruleDataClient: RuleDataClient;
}) => {
  const { lists, logger, ruleDataClient } = createOptions;
  const createSecurityRuleType = createSecurityRuleTypeFactory({
    lists,
    logger,
    ruleDataClient,
  });
  return createSecurityRuleType({
    id: THRESHOLD_ALERT_TYPE_ID,
    name: 'Threshold Rule',
    validate: {
      params: {
        validate: (object: unknown): ThresholdRuleParams => {
          const [validated, errors] = validateNonExact(object, thresholdRuleParams);
          if (errors != null) {
            throw new Error(errors);
          }
          if (validated == null) {
            throw new Error('Validation of rule params failed');
          }
          return validated;
        },
      },
    },
    /*
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
    */
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
    isExportable: false,
    producer: 'security-solution',
    async executor({ startedAt, services, params, alertId }) {
      const { index, query, threshold } = params;
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
        bucketByFields: threshold.field,
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
        query,
        savedId: undefined,
        services: (services as unknown) as AlertServices,
        index,
        lists: [],
      });

      const {
        searchResult: thresholdResults,
        searchErrors,
        searchDuration: thresholdSearchDuration,
      } = await findThresholdSignals({
        inputIndexPattern: index ?? [],
        from,
        to,
        services: (services as unknown) as AlertServices,
        logger,
        filter: esFilter,
        threshold: {
          field: threshold.field,
          value: threshold.value,
          cardinality: threshold.cardinality,
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
