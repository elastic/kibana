/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { countBy, isEmpty } from 'lodash';
import { performance } from 'perf_hooks';
import { AlertServices } from '../../../../../alerts/server';
import { SignalSearchResponse, BulkResponse, BaseSignalHit } from './types';
import { RuleAlertAction } from '../../../../common/detection_engine/types';
import { RuleTypeParams, RefreshTypes } from '../types';
import { generateId, makeFloatString, errorAggregator } from './utils';
import { buildBulkBody } from './build_bulk_body';
import { BuildRuleMessage } from './rule_messages';
import { Logger } from '../../../../../../../src/core/server';
import { isEventTypeSignal } from './build_event_type_signal';

interface SingleBulkCreateParams {
  filteredEvents: SignalSearchResponse;
  ruleParams: RuleTypeParams;
  services: AlertServices;
  logger: Logger;
  id: string;
  signalsIndex: string;
  actions: RuleAlertAction[];
  name: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  interval: string;
  enabled: boolean;
  tags: string[];
  throttle: string;
  refresh: RefreshTypes;
  buildRuleMessage: BuildRuleMessage;
}

/**
 * This is for signals on signals to work correctly. If given a rule id this will check if
 * that rule id already exists in the ancestor tree of each signal search response and remove
 * those documents so they cannot be created as a signal since we do not want a rule id to
 * ever be capable of re-writing the same signal continuously if both the _input_ and _output_
 * of the signals index happens to be the same index.
 * @param ruleId The rule id
 * @param signalSearchResponse The search response that has all the documents
 */
export const filterDuplicateRules = (
  ruleId: string,
  signalSearchResponse: SignalSearchResponse
) => {
  return signalSearchResponse.hits.hits.filter((doc) => {
    if (doc._source.signal == null || !isEventTypeSignal(doc)) {
      return true;
    } else {
      return !(
        doc._source.signal.ancestors.some((ancestor) => ancestor.rule === ruleId) ||
        doc._source.signal.rule.id === ruleId
      );
    }
  });
};

/**
 * Similar to filterDuplicateRules, but operates on candidate signal documents rather than events that matched
 * the detection query. This means we only have to compare the ruleId against the ancestors array.
 * @param ruleId The rule id
 * @param signals The candidate new signals
 */
export const filterDuplicateSignals = (ruleId: string, signals: BaseSignalHit[]) => {
  return signals.filter(
    (doc) => !doc._source.signal?.ancestors.some((ancestor) => ancestor.rule === ruleId)
  );
};

export interface SingleBulkCreateResponse {
  success: boolean;
  bulkCreateDuration?: string;
  createdItemsCount: number;
  errors: string[];
}

export interface BulkInsertSignalsResponse {
  bulkCreateDuration: string;
  createdItemsCount: number;
}

// Bulk Index documents.
export const singleBulkCreate = async ({
  buildRuleMessage,
  filteredEvents,
  ruleParams,
  services,
  logger,
  id,
  signalsIndex,
  actions,
  name,
  createdAt,
  createdBy,
  updatedAt,
  updatedBy,
  interval,
  enabled,
  refresh,
  tags,
  throttle,
}: SingleBulkCreateParams): Promise<SingleBulkCreateResponse> => {
  filteredEvents.hits.hits = filterDuplicateRules(id, filteredEvents);
  logger.debug(buildRuleMessage(`about to bulk create ${filteredEvents.hits.hits.length} events`));
  if (filteredEvents.hits.hits.length === 0) {
    logger.debug(buildRuleMessage(`all events were duplicates`));
    return { success: true, createdItemsCount: 0, errors: [] };
  }
  // index documents after creating an ID based on the
  // source documents' originating index, and the original
  // document _id. This will allow two documents from two
  // different indexes with the same ID to be
  // indexed, and prevents us from creating any updates
  // to the documents once inserted into the signals index,
  // while preventing duplicates from being added to the
  // signals index if rules are re-run over the same time
  // span. Also allow for versioning.
  const bulkBody = filteredEvents.hits.hits.flatMap((doc) => [
    {
      create: {
        _index: signalsIndex,
        _id: generateId(
          doc._index,
          doc._id,
          doc._version ? doc._version.toString() : '',
          ruleParams.ruleId ?? ''
        ),
      },
    },
    buildBulkBody({
      doc,
      ruleParams,
      id,
      actions,
      name,
      createdAt,
      createdBy,
      updatedAt,
      updatedBy,
      interval,
      enabled,
      tags,
      throttle,
    }),
  ]);
  const start = performance.now();
  const response: BulkResponse = await services.callCluster('bulk', {
    index: signalsIndex,
    refresh,
    body: bulkBody,
  });
  const end = performance.now();
  logger.debug(
    buildRuleMessage(
      `individual bulk process time took: ${makeFloatString(end - start)} milliseconds`
    )
  );
  logger.debug(buildRuleMessage(`took property says bulk took: ${response.took} milliseconds`));

  const createdItemsCount = countBy(response.items, 'create.status')['201'] ?? 0;
  const duplicateSignalsCount = countBy(response.items, 'create.status')['409'];
  const errorCountByMessage = errorAggregator(response, [409]);

  logger.debug(buildRuleMessage(`bulk created ${createdItemsCount} signals`));
  if (duplicateSignalsCount > 0) {
    logger.debug(buildRuleMessage(`ignored ${duplicateSignalsCount} duplicate signals`));
  }

  if (!isEmpty(errorCountByMessage)) {
    logger.error(
      buildRuleMessage(
        `[-] bulkResponse had errors with responses of: ${JSON.stringify(errorCountByMessage)}`
      )
    );
    return {
      errors: Object.keys(errorCountByMessage),
      success: false,
      bulkCreateDuration: makeFloatString(end - start),
      createdItemsCount,
    };
  } else {
    return {
      errors: [],
      success: true,
      bulkCreateDuration: makeFloatString(end - start),
      createdItemsCount,
    };
  }
};

// Bulk Index new signals.
export const bulkInsertSignals = async (
  signals: BaseSignalHit[],
  logger: Logger,
  services: AlertServices,
  refresh: RefreshTypes
): Promise<BulkInsertSignalsResponse> => {
  // index documents after creating an ID based on the
  // id and index of each parent and the rule ID
  const bulkBody = signals.flatMap((doc) => [
    {
      create: {
        _index: doc._index,
        _id: doc._id,
      },
    },
    doc._source,
  ]);
  const start = performance.now();
  const response: BulkResponse = await services.callCluster('bulk', {
    refresh,
    body: bulkBody,
  });
  const end = performance.now();
  logger.debug(`individual bulk process time took: ${makeFloatString(end - start)} milliseconds`);
  logger.debug(`took property says bulk took: ${response.took} milliseconds`);

  if (response.errors) {
    const duplicateSignalsCount = countBy(response.items, 'create.status')['409'];
    logger.debug(`ignored ${duplicateSignalsCount} duplicate signals`);
    const errorCountByMessage = errorAggregator(response, [409]);
    if (!isEmpty(errorCountByMessage)) {
      logger.error(
        `[-] bulkResponse had errors with responses of: ${JSON.stringify(errorCountByMessage)}`
      );
    }
  }

  const createdItemsCount = countBy(response.items, 'create.status')['201'] ?? 0;
  logger.debug(`bulk created ${createdItemsCount} signals`);
  return { bulkCreateDuration: makeFloatString(end - start), createdItemsCount };
};
