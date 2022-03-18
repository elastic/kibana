/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import { useCallback, useEffect, useRef, useState } from 'react';
import deepEqual from 'fast-deep-equal';
import { Subscription } from 'rxjs';

import { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { useKibana } from '../../../common/lib/kibana';
import {
  DocValueFields,
  TimelineEventsDetailsItem,
  TimelineEventsQueries,
  TimelineEventsDetailsRequestOptions,
  TimelineEventsDetailsStrategyResponse,
} from '../../../../common/search_strategy';
import { isCompleteResponse, isErrorResponse } from '../../../../../../../src/plugins/data/common';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import * as i18n from './translations';
import { EntityType } from '../../../../../timelines/common';
import { Ecs } from '../../../../common/ecs';

export interface EventsArgs {
  detailsData: TimelineEventsDetailsItem[] | null;
  ecs: Ecs | null;
}

export interface UseTimelineEventsDetailsProps {
  entityType?: EntityType;
  docValueFields: DocValueFields[];
  indexName: string;
  eventId: string;
  runtimeMappings: MappingRuntimeFields;
  skip: boolean;
}

export const useTimelineEventsDetails = ({
  entityType = EntityType.EVENTS,
  docValueFields,
  indexName,
  eventId,
  runtimeMappings,
  skip,
}: UseTimelineEventsDetailsProps): [
  boolean,
  EventsArgs['detailsData'],
  object | undefined,
  EventsArgs['ecs'],
  () => Promise<void>
] => {
  const asyncNoop = () => Promise.resolve();
  const { data } = useKibana().services;
  const refetch = useRef<() => Promise<void>>(asyncNoop);
  const abortCtrl = useRef(new AbortController());
  const searchSubscription$ = useRef(new Subscription());
  const [loading, setLoading] = useState(false);
  const [timelineDetailsRequest, setTimelineDetailsRequest] =
    useState<TimelineEventsDetailsRequestOptions | null>(null);
  const { addError, addWarning } = useAppToasts();

  const [timelineDetailsResponse, setTimelineDetailsResponse] =
    useState<EventsArgs['detailsData']>(null);
  const [ecsData, setEcsData] = useState<EventsArgs['ecs']>(null);

  const [rawEventData, setRawEventData] = useState<object | undefined>(undefined);

  const timelineDetailsSearch = useCallback(
    (request: TimelineEventsDetailsRequestOptions | null) => {
      if (request == null || skip || isEmpty(request.eventId)) {
        return;
      }

      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        searchSubscription$.current = data.search
          .search<TimelineEventsDetailsRequestOptions, TimelineEventsDetailsStrategyResponse>(
            request,
            {
              strategy: 'timelineSearchStrategy',
              abortSignal: abortCtrl.current.signal,
            }
          )
          .subscribe({
            next: (response) => {
              if (isCompleteResponse(response)) {
                setLoading(false);
                setTimelineDetailsResponse(response.data || []);
                setRawEventData(response.rawResponse.hits.hits[0]);
                setEcsData(response.ecs || null);
                searchSubscription$.current.unsubscribe();
              } else if (isErrorResponse(response)) {
                setLoading(false);
                addWarning(i18n.FAIL_TIMELINE_DETAILS);
                searchSubscription$.current.unsubscribe();
              }
            },
            error: (msg) => {
              setLoading(false);
              addError(msg, { title: i18n.FAIL_TIMELINE_SEARCH_DETAILS });
              searchSubscription$.current.unsubscribe();
            },
          });
      };
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
      asyncSearch();
      refetch.current = asyncSearch;
    },
    [data.search, addError, addWarning, skip]
  );

  useEffect(() => {
    setTimelineDetailsRequest((prevRequest) => {
      const myRequest = {
        ...(prevRequest ?? {}),
        docValueFields,
        entityType,
        indexName,
        eventId,
        factoryQueryType: TimelineEventsQueries.details,
        runtimeMappings,
      };
      if (!deepEqual(prevRequest, myRequest)) {
        return myRequest;
      }
      return prevRequest;
    });
  }, [docValueFields, entityType, eventId, indexName, runtimeMappings]);

  useEffect(() => {
    timelineDetailsSearch(timelineDetailsRequest);
    return () => {
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
    };
  }, [timelineDetailsRequest, timelineDetailsSearch]);

  return [loading, timelineDetailsResponse, rawEventData, ecsData, refetch.current];
};
