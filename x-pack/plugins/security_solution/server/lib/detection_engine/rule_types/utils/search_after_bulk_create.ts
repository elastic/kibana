/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { identity } from 'lodash';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { singleSearchAfter } from './single_search_after';
import { filterEventsAgainstList } from './large_list_filters/filter_events_against_list';
import { sendAlertTelemetryEvents } from './send_telemetry_events';
import {
  createSearchAfterReturnType,
  createSearchResultReturnType,
  createSearchAfterReturnTypeFromResponse,
  getTotalHitsValue,
  mergeReturns,
  mergeSearchResults,
  getSafeSortIds,
  addToSearchAfterReturn,
} from './utils';
import type { SearchAfterAndBulkCreateParams, SearchAfterAndBulkCreateReturnType } from '../types';
import { withSecuritySpan } from '../../../../utils/with_security_span';
import { createEnrichEventsFunction } from './enrichments';

// search_after through documents and re-index using bulk endpoint.
export const searchAfterAndBulkCreate = async ({
  buildReasonMessage,
  bulkCreate,
  enrichment = identity,
  eventsTelemetry,
  exceptionsList,
  filter,
  inputIndexPattern,
  listClient,
  pageSize,
  ruleExecutionLogger,
  services,
  sortOrder,
  trackTotalHits,
  tuple,
  wrapHits,
  runtimeMappings,
  primaryTimestamp,
  secondaryTimestamp,
}: SearchAfterAndBulkCreateParams): Promise<SearchAfterAndBulkCreateReturnType> => {
  return withSecuritySpan('searchAfterAndBulkCreate', async () => {
    let toReturn = createSearchAfterReturnType();

    /*
    throw new Error(`[2023-04-18T10:26:22.346+02:00][DEBUG][plugins.securitySolution.ruleExecution] totalHits: 0 [siem.queryRule][test2][rule id dba013b0-dd1b-11ed-8928-6155599ac787][rule uuid 649f8c4e-dc85-4394-8cc2-fb8a522188f9][exec id 44e0c8ea-29a7-49be-8b71-5359cfe3baa2][space default]
    [2023-04-18T10:26:22.347+02:00][DEBUG][plugins.securitySolution.ruleExecution] searchResult.hit.hits.length: 0 [siem.queryRule][test2][rule id dba013b0-dd1b-11ed-8928-6155599ac787][rule uuid 649f8c4e-dc85-4394-8cc2-fb8a522188f9][exec id 44e0c8ea-29a7-49be-8b71-5359cfe3baa2][space default]
    [2023-04-18T10:26:22.347+02:00][DEBUG][plugins.securitySolution.ruleExecution] totalHits was 0, exiting early [siem.queryRule][test2][rule id dba013b0-dd1b-11ed-8928-6155599ac787][rule uuid 649f8c4e-dc85-4394-8cc2-fb8a522188f9][exec id 44e0c8ea-29a7-49be-8b71-5359cfe3baa2][space default]
    [2023-04-18T10:26:22.347+02:00][DEBUG][plugins.securitySolution.ruleExecution] [+] completed bulk index of 0 [siem.queryRule][test2][rule id dba013b0-dd1b-11ed-8928-6155599ac787][rule uuid 649f8c4e-dc85-4394-8cc2-fb8a522188f9][exec id 44e0c8ea-29a7-49be-8b71-5359cfe3baa2][space default]
    [2023-04-18T10:26:22.347+02:00][DEBUG][plugins.securitySolution.ruleExecution] [+] Signal Rule execution completed. [siem.queryRule][test2][rule id dba013b0-dd1b-11ed-8928-6155599ac787][rule uuid 649f8c4e-dc85-4394-8cc2-fb8a522188f9][exec id 44e0c8ea-29a7-49be-8b71-5359cfe3baa2][space default]
    [2023-04-18T10:26:22.347+02:00][DEBUG][plugins.securitySolution.ruleExecution] [+] Finished indexing 0 signals into .alerts-security.alerts-default [siem.queryRule][test2][rule id dba013b0-dd1b-11ed-8928-6155599ac787][rule uuid 649f8c4e-dc85-4394-8cc2-fb8a522188f9][exec id 44e0c8ea-29a7-49be-8b71-5359cfe3baa2][space default]
    [2023-04-18T10:26:22.347+02:00][INFO ][plugins.securitySolution.ruleExecution] Changing rule status to "succeeded". Rule execution completed successfully [siem.queryRule][test2][rule id dba013b0-dd1b-11ed-8928-6155599ac787][rule uuid 649f8c4e-dc85-4394-8cc2-fb8a522188f9][exec id 44e0c8ea-29a7-49be-8b71-5359cfe3baa2][space default]
    [2023-04-18T10:26:22.348+02:00][DEBUG][plugins.securitySolution.ruleExecution] [+] Finished indexing 0 signals searched between date ranges [
      {
        "to": "2023-04-18T08:26:22.206Z",
        "from": "2023-04-18T07:21:22.206Z",
        "maxSignals": 100
      }
    ] [siem.queryRule][test2][rule id dba013b0-dd1b-11ed-8928-6155599ac787][rule uuid 649f8c4e-dc85-4394-8cc2-fb8a522188f9][exec id 44e0c8ea-29a7-49be-8b71-5359cfe3baa2][space default]
    {"log.level":"error","@timestamp":"2023-04-18T08:26:30.843Z","log":{"logger":"elastic-apm-node"},"ecs":{"version":"1.6.0"},"message":"APM Server responded with \"404 Not Found\". This might be because you're running an incompatible version of the APM Server. This agent only supports APM Server v6.5 and above. If you're using an older version of the APM Server, please downgrade this agent to version 1.x or upgrade the APM Server\n{\"ok\":false,\"message\":\"Unknown resource.\"}\n"}
    [2023-04-18T10:26:34.305+02:00][DEBUG][plugins.securitySolution.endpoint:user-artifact-packager:1.0.0] Last computed manifest not available yet
    [2023-04-18T10:26:37.241+02:00][DEBUG][plugins.securitySolution.telemetry_events] [task security:telemetry-filterlist-artifact:1.0.0]: attempting to run
    [2023-04-18T10:26:37.241+02:00][DEBUG][plugins.securitySolution.telemetry_events] [task security:telemetry-filterlist-artifact:1.0.0]: telemetry is not opted-in
    {"log.level":"error","@timestamp":"2023-04-18T08:26:50.230Z","log":{"logger":"elastic-apm-node"},"ecs":{"version":"1.6.0"},"message":"APM Server responded with \"404 Not Found\". This might be because you're running an incompatible version of the APM Server. This agent only supports APM Server v6.5 and above. If you're using an older version of the APM Server, please downgrade this agent to version 1.x or upgrade the APM Server\n{\"ok\":false,\"message\":\"Unknown resource.\"}\n"}`);
    */

    // sortId tells us where to start our next consecutive search_after query
    let sortIds: estypes.SortResults | undefined;
    let hasSortId = true; // default to true so we execute the search on initial run

    if (tuple == null || tuple.to == null || tuple.from == null) {
      ruleExecutionLogger.error(`[-] malformed date tuple`);
      return createSearchAfterReturnType({
        success: false,
        errors: ['malformed date tuple'],
      });
    }

    while (toReturn.createdSignalsCount < tuple.maxSignals) {
      try {
        let mergedSearchResults = createSearchResultReturnType();
        ruleExecutionLogger.debug(`sortIds: ${sortIds}`);

        if (hasSortId) {
          const { searchResult, searchDuration, searchErrors } = await singleSearchAfter({
            searchAfterSortIds: sortIds,
            index: inputIndexPattern,
            runtimeMappings,
            from: tuple.from.toISOString(),
            to: tuple.to.toISOString(),
            services,
            ruleExecutionLogger,
            filter,
            pageSize: Math.ceil(Math.min(tuple.maxSignals, pageSize)),
            primaryTimestamp,
            secondaryTimestamp,
            trackTotalHits,
            sortOrder,
          });
          mergedSearchResults = mergeSearchResults([mergedSearchResults, searchResult]);
          toReturn = mergeReturns([
            toReturn,
            createSearchAfterReturnTypeFromResponse({
              searchResult: mergedSearchResults,
              primaryTimestamp,
            }),
            createSearchAfterReturnType({
              searchAfterTimes: [searchDuration],
              errors: searchErrors,
            }),
          ]);

          const lastSortIds = getSafeSortIds(
            searchResult.hits.hits[searchResult.hits.hits.length - 1]?.sort
          );
          if (lastSortIds != null && lastSortIds.length !== 0) {
            sortIds = lastSortIds;
            hasSortId = true;
          } else {
            hasSortId = false;
          }
        }

        // determine if there are any candidate signals to be processed
        const totalHits = getTotalHitsValue(mergedSearchResults.hits.total);
        ruleExecutionLogger.debug(`totalHits: ${totalHits}`);
        ruleExecutionLogger.debug(
          `searchResult.hit.hits.length: ${mergedSearchResults.hits.hits.length}`
        );

        if (totalHits === 0 || mergedSearchResults.hits.hits.length === 0) {
          ruleExecutionLogger.debug(
            `${
              totalHits === 0 ? 'totalHits' : 'searchResult.hits.hits.length'
            } was 0, exiting early`
          );
          break;
        }

        // filter out the search results that match with the values found in the list.
        // the resulting set are signals to be indexed, given they are not duplicates
        // of signals already present in the signals index.
        const [includedEvents, _] = await filterEventsAgainstList({
          listClient,
          exceptionsList,
          ruleExecutionLogger,
          events: mergedSearchResults.hits.hits,
        });

        // only bulk create if there are filteredEvents leftover
        // if there isn't anything after going through the value list filter
        // skip the call to bulk create and proceed to the next search_after,
        // if there is a sort id to continue the search_after with.
        if (includedEvents.length !== 0) {
          // make sure we are not going to create more signals than maxSignals allows
          const limitedEvents = includedEvents.slice(
            0,
            tuple.maxSignals - toReturn.createdSignalsCount
          );
          const enrichedEvents = await enrichment(limitedEvents);
          const wrappedDocs = wrapHits(enrichedEvents, buildReasonMessage);

          const bulkCreateResult = await bulkCreate(
            wrappedDocs,
            undefined,
            createEnrichEventsFunction({
              services,
              logger: ruleExecutionLogger,
            })
          );

          addToSearchAfterReturn({ current: toReturn, next: bulkCreateResult });

          ruleExecutionLogger.debug(`created ${bulkCreateResult.createdItemsCount} signals`);
          ruleExecutionLogger.debug(`signalsCreatedCount: ${toReturn.createdSignalsCount}`);
          ruleExecutionLogger.debug(`enrichedEvents.hits.hits: ${enrichedEvents.length}`);

          sendAlertTelemetryEvents(
            enrichedEvents,
            bulkCreateResult.createdItems,
            eventsTelemetry,
            ruleExecutionLogger
          );
        }

        if (!hasSortId) {
          ruleExecutionLogger.debug('ran out of sort ids to sort on');
          break;
        }
      } catch (exc: unknown) {
        ruleExecutionLogger.error(`[-] search_after_bulk_create threw an error ${exc}`);
        return mergeReturns([
          toReturn,
          createSearchAfterReturnType({
            success: false,
            errors: [`${exc}`],
          }),
        ]);
      }
    }
    ruleExecutionLogger.debug(`[+] completed bulk index of ${toReturn.createdSignalsCount}`);
    return toReturn;
  });
};
