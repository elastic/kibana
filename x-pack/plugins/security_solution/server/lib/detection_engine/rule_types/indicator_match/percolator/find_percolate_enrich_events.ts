/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
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
  RuleExecutorServices,
} from '../../../../../../../alerting/server';
import { BuildRuleMessage } from '../../../signals/rule_messages';
import { ListClient } from '../../../../../../../lists/server';
import { percolateSourceEvents } from './percolate_source_events';
import { enrichEvents } from './enrich_events';
import { IRuleDataClient } from '../../../../../../../rule_registry/server';

export interface FindPercolateEnrichOptions {
  buildRuleMessage: BuildRuleMessage;
  exceptionsList: ExceptionListItemSchema[];
  filters: unknown[];
  index: string[];
  language: 'eql' | 'kuery' | 'lucene' | undefined;
  listClient: ListClient;
  logger: Logger;
  percolatorRuleDataClient: IRuleDataClient;
  perPage: number;
  query: string;
  ruleId: string;
  ruleVersion: number;
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  spaceId: string;
  timestampOverride?: string;
  tuple: RuleRangeTuple;
}

export const findPercolateEnrichEvents = async ({
  buildRuleMessage,
  exceptionsList,
  filters,
  index,
  language,
  listClient,
  logger,
  percolatorRuleDataClient,
  perPage,
  query,
  ruleId,
  ruleVersion,
  services,
  spaceId,
  timestampOverride,
  tuple,
}: FindPercolateEnrichOptions) => {
  let success = true;
  let enrichedHits: Array<estypes.SearchHit<SignalSource>> = [];
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

    while (
      success &&
      (iterationCount === 0 || lastResult.hits.hits.length > 0) &&
      enrichedHits.length < tuple.maxSignals
    ) {
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
        break;
      } else if (searchResult.hits.hits.length === 0) break;

      const filteredEvents = await filterEventsAgainstList({
        listClient,
        exceptionsList,
        logger,
        eventSearchResult: searchResult,
        buildRuleMessage,
      });

      const filteredHits = filteredEvents.hits.hits;

      if (filteredHits.length > 0) {
        const {
          percolatorResponse,
          success: percolatorSuccess,
          errors: percolateErrors,
        } = await percolateSourceEvents({
          hits: filteredHits,
          percolatorRuleDataClient,
          ruleId,
          ruleVersion,
          spaceId,
        });

        if (!percolatorSuccess || percolateErrors.length) {
          percolateErrors.forEach((error) => errors.push(error));
          success = false;
          break;
        }

        if (percolatorResponse.hits.hits.length) {
          const currentEnrichedHits = enrichEvents({
            hits: filteredHits,
            percolatorResponse,
          });
          enrichedHits = [...enrichedHits, ...currentEnrichedHits];
        }
      }

      lastResult = searchResult;
      iterationCount++;
    }
  } catch (exc: unknown) {
    logger.error(buildRuleMessage(`[-] fetch_source_events threw an error ${exc}`));
    errors.push(`${exc}`);
    success = false;
  }

  return {
    enrichedHits,
    errors,
    success,
  };
};
