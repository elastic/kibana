/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import { Logger } from '@kbn/logging';
import { validateNonExact } from '@kbn/securitysolution-io-ts-utils';

import { AlertServices } from '../../../../../../alerting/server';
import { PersistenceServices, RuleDataClient } from '../../../../../../rule_registry/server';
import { THRESHOLD_ALERT_TYPE_ID } from '../../../../../common/constants';
import { SetupPlugins } from '../../../../../target/types/server/plugin';
import { thresholdRuleParams, ThresholdRuleParams } from '../../schemas/rule_schemas';
import { findThresholdSignals, getThresholdBucketFilters } from '../../signals/threshold';
import { buildThresholdSignalHistory } from './build_threshold_signal_history';
import { getFilter } from '../../signals/get_filter';
import { createSecurityRuleTypeFactory } from '../create_security_rule_type_factory';
import { createResultObject } from '../utils';
import { ConfigType } from '../../../../config';
import { ThresholdAlertState } from './types';
import { formatThresholdSignals } from './format_threshold_signals';

export const createThresholdAlertType = (createOptions: {
  lists: SetupPlugins['lists'];
  logger: Logger;
  mergeStrategy: ConfigType['alertMergeStrategy'];
  ruleDataClient: RuleDataClient;
}) => {
  const { lists, logger, mergeStrategy, ruleDataClient } = createOptions;
  const createSecurityRuleType = createSecurityRuleTypeFactory({
    lists,
    logger,
    mergeStrategy,
    ruleDataClient,
  });
  return createSecurityRuleType<ThresholdRuleParams, {}, PersistenceServices, ThresholdAlertState>({
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
    async executor(execOptions) {
      const {
        alertId,
        params,
        runOpts: {
          buildRuleMessage,
          bulkCreate,
          exceptionItems,
          listClient,
          rule,
          searchAfterSize,
          tuple,
          wrapHits,
        },
        services,
        startedAt,
        state,
      } = execOptions;
      const result = createResultObject<ThresholdAlertState>(state);
      const { index, outputIndex, query, threshold, timestampOverride } = params;
      const fromDate = moment(startedAt).subtract(moment.duration(5, 'm')); // hardcoded 5-minute rule interval
      const from = fromDate.toISOString();
      const to = startedAt.toISOString();

      const { signalHistory: thresholdSignalHistory } = state;
      // TODO: clean up any signal history that has fallen outside the window

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

      result.state = {
        ...result.state,
        ...buildThresholdSignalHistory({
          alerts,
          bucketByFields: threshold.field,
        }),
      };

      if (searchErrors.length === 0) {
        const bulkCreateResult = bulkCreate(alerts);
        return {
          ...result,
          ...bulkCreateResult,
        };
      } else {
        throw new Error(searchErrors.join('\n'));
      }
    },
  });
};
