/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import dateMath from '@elastic/datemath';
import { validateNonExact } from '@kbn/securitysolution-io-ts-utils';
import { NEW_TERMS_RULE_TYPE_ID } from '@kbn/securitysolution-rules';
import { SERVER_APP_ID } from '../../../../../common/constants';

import { newTermsRuleParams, NewTermsRuleParams } from '../../schemas/rule_schemas';
import { CreateRuleOptions, SecurityAlertType } from '../types';
import { getInputIndex } from '../../signals/get_input_output_index';
import { singleSearchAfter } from '../../signals/single_search_after';
import { getFilter } from '../../signals/get_filter';
import { SignalSource } from '../../signals/types';
import { buildReasonMessageForNewTermsAlert } from '../../signals/reason_formatters';
import { GenericBulkCreateResponse } from '../factories';
import { BaseFieldsLatest } from '../../../../../common/detection_engine/schemas/alerts';
import { wrapNewTermsAlerts } from '../factories/utils/wrap_new_terms_alerts';
import { buildNewTermsAggregation, NewTermsAggregationResult } from './build_new_terms_aggregation';
import {
  buildTimestampRuntimeMapping,
  TIMESTAMP_RUNTIME_FIELD,
} from './build_timestamp_runtime_mapping';

interface BulkCreateResults {
  bulkCreateTimes: string[];
  createdSignalsCount: number;
  createdSignals: unknown[];
  success: boolean;
  errors: string[];
}

interface SearchAfterResults {
  searchDurations: string[];
  searchErrors: string[];
}

const addBulkCreateResults = (
  results: BulkCreateResults,
  newResults: GenericBulkCreateResponse<BaseFieldsLatest>
): BulkCreateResults => {
  return {
    bulkCreateTimes: [...results.bulkCreateTimes, newResults.bulkCreateDuration],
    createdSignalsCount: results.createdSignalsCount + newResults.createdItemsCount,
    createdSignals: [...results.createdSignals, ...newResults.createdItems],
    success: results.success && newResults.success,
    errors: [...results.errors, ...newResults.errors],
  };
};

export const createNewTermsAlertType = (
  createOptions: CreateRuleOptions
): SecurityAlertType<NewTermsRuleParams, {}, {}, 'default'> => {
  const { experimentalFeatures, logger, version } = createOptions;
  return {
    id: NEW_TERMS_RULE_TYPE_ID,
    name: 'New Terms Rule',
    validate: {
      params: {
        validate: (object: unknown) => {
          const [validated, errors] = validateNonExact(object, newTermsRuleParams);
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
    producer: SERVER_APP_ID,
    async executor(execOptions) {
      const {
        runOpts: {
          buildRuleMessage,
          bulkCreate,
          completeRule,
          exceptionItems,
          tuple,
          mergeStrategy,
        },
        services,
        params,
        spaceId,
      } = execOptions;

      const inputIndex = await getInputIndex({
        experimentalFeatures,
        services,
        version,
        index: params.index,
      });

      const filter = await getFilter({
        filters: params.filters,
        index: inputIndex,
        language: params.language,
        savedId: undefined,
        services,
        type: params.type,
        query: params.query,
        lists: exceptionItems,
      });

      const parsedHistoryWindowSize = dateMath.parse(params.historyWindowStart, {
        forceNow: tuple.to.toDate(),
      });
      if (parsedHistoryWindowSize == null) {
        throw Error(`Failed to parse 'historyWindowStart'`);
      }

      // If we have a timestampOverride, we'll compute a runtime field that emits the override for each document if it exists,
      // otherwise it emits @timestamp. If we don't have a timestamp override we don't want to pay the cost of using a
      // runtime field, so we just use @timestamp directly.
      const { timestampField, runtimeMappings } = params.timestampOverride
        ? {
            timestampField: TIMESTAMP_RUNTIME_FIELD,
            runtimeMappings: buildTimestampRuntimeMapping({
              timestampOverride: params.timestampOverride,
            }),
          }
        : { timestampField: '@timestamp', runtimeMappings: undefined };

      const { searchResult, searchDuration, searchErrors } = await singleSearchAfter({
        aggregations: buildNewTermsAggregation({
          newValueWindowStart: tuple.from,
          field: params.newTermsFields[0],
          maxSignals: params.maxSignals,
          timestampField,
        }),
        runtimeMappings,
        searchAfterSortIds: undefined,
        index: inputIndex,
        from: parsedHistoryWindowSize.toISOString(),
        to: tuple.to.toISOString(),
        services,
        filter,
        logger,
        pageSize: 0,
        timestampOverride: params.timestampOverride,
        buildRuleMessage,
      });
      const searchResultWithAggs = searchResult as NewTermsAggregationResult;
      if (!searchResultWithAggs.aggregations) {
        throw new Error('expected to find aggregations on search result');
      }

      const bulkCreateResults: BulkCreateResults = {
        bulkCreateTimes: [],
        createdSignalsCount: 0,
        createdSignals: [],
        success: true,
        errors: [],
      };

      const searchAfterResults: SearchAfterResults = {
        searchDurations: [searchDuration],
        searchErrors,
      };

      const eventsAndTerms: Array<{
        event: estypes.SearchHit<SignalSource>;
        newTerms: Array<string | number>;
      }> = [];
      const bucketsForField = searchResultWithAggs.aggregations.new_terms.buckets;
      bucketsForField.forEach((bucket) => {
        eventsAndTerms.push({
          event: bucket.docs.hits.hits[0],
          newTerms: [bucket.key],
        });
      });

      const wrappedAlerts = wrapNewTermsAlerts({
        eventsAndTerms,
        spaceId,
        completeRule,
        mergeStrategy,
        buildReasonMessage: buildReasonMessageForNewTermsAlert,
      });

      addBulkCreateResults(bulkCreateResults, await bulkCreate(wrappedAlerts));

      return {
        // If an error occurs but doesn't cause us to throw then we still count the execution as a success.
        // Should be refactored for better clarity, but that's how it is for now.
        success: true,
        warning: false,
        searchAfterTimes: [searchDuration],
        bulkCreateTimes: bulkCreateResults.bulkCreateTimes,
        lastLookBackDate: undefined,
        createdSignalsCount: bulkCreateResults.createdSignalsCount,
        createdSignals: bulkCreateResults.createdSignals,
        errors: [...searchAfterResults.searchErrors, ...bulkCreateResults.errors],
        warningMessages: [],
        state: {},
      };
    },
  };
};
