/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { Logger } from '@kbn/logging';
import { RuleRangeTuple, SignalSource } from '../../../signals/types';
import { createSearchResultReturnType, getSafeSortIds } from '../../../signals/utils';
import { singleSearchAfter } from '../../../signals/single_search_after';
import { getFilter } from '../../../signals/get_filter';
import { filterEventsAgainstList } from '../../../signals/filters/filter_events_against_list';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertServices,
} from '../../../../../../../alerting/server';
import { BuildRuleMessage } from '../../../signals/rule_messages';
import { ListClient } from '../../../../../../../lists/server';
import { BaseHit } from '../../../../../../common/detection_engine/types';

export interface FetchSourceEventsOptions {
  buildRuleMessage: BuildRuleMessage;
  exceptionsList: ExceptionListItemSchema[];
  filters: unknown[];
  index: string[];
  language: 'eql' | 'kuery' | 'lucene' | undefined;
  listClient: ListClient;
  logger: Logger;
  perPage: number;
  query: string;
  services: AlertServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  timestampOverride?: string;
  tuple: RuleRangeTuple;
}

export const fetchSourceEvents = async ({
  buildRuleMessage,
  exceptionsList,
  filters,
  index,
  language,
  listClient,
  logger,
  perPage,
  query,
  services,
  timestampOverride,
  tuple,
}: FetchSourceEventsOptions) => {
  let success = true;
  let eventHits: Array<BaseHit<SignalSource>> = [];
  const errors: string[] = [];

  try {
    const esFilter = await getFilter({
      type: 'threat_match',
      filters,
      language,
      query,
      services,
      index,
      lists: exceptionsList,
      savedId: undefined,
    });

    let iterationCount = 0;
    let lastResult = createSearchResultReturnType();

    while (success && (iterationCount === 0 || lastResult.hits.hits.length > 0)) {
      const { searchResult, searchErrors } = await singleSearchAfter({
        buildRuleMessage,
        filter: esFilter,
        from: tuple.from.toISOString(),
        index,
        logger,
        pageSize: perPage,
        searchAfterSortIds:
          getSafeSortIds(lastResult.hits.hits[lastResult.hits.hits.length - 1]?.sort) ?? [],
        services,
        sortOrder: undefined,
        timestampOverride,
        to: tuple.to.toISOString(),
        trackTotalHits: false,
      });

      if (searchErrors.length) {
        searchErrors.forEach((error) => errors.push(error));
        success = false;
      }

      const filteredEvents = await filterEventsAgainstList({
        listClient,
        exceptionsList,
        logger,
        eventSearchResult: searchResult,
        buildRuleMessage,
      });

      eventHits = [...eventHits, ...(filteredEvents.hits.hits as Array<BaseHit<SignalSource>>)];

      lastResult = searchResult;
      iterationCount++;
    }
  } catch (exc: unknown) {
    logger.error(buildRuleMessage(`[-] fetch_source_events threw an error ${exc}`));
    errors.push(`${exc}`);
    success = false;
  }

  return {
    eventHits,
    errors,
    success,
  };
};
