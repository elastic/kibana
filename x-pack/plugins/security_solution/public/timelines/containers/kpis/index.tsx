/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noop } from 'lodash/fp';
import { useCallback, useEffect, useRef, useState } from 'react';
import deepEqual from 'fast-deep-equal';
import { Subscription } from 'rxjs';

import { inputsModel } from '../../../common/store';
import { useKibana } from '../../../common/lib/kibana';
import {
  DocValueFields,
  TimelineEventsQueries,
  TimelineKpiStrategyRequest,
  TimelineKpiStrategyResponse,
  TimerangeInput,
} from '../../../../common/search_strategy';
import { ESQuery } from '../../../../common/typed_json';
import { isCompleteResponse, isErrorResponse } from '../../../../../../../src/plugins/data/public';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import * as i18n from './translations';

export interface UseTimelineKpiProps {
  timerange: TimerangeInput;
  filterQuery?: ESQuery | string | undefined;
  defaultIndex: string[];
  docValueFields?: DocValueFields[];
  isBlankTimeline: boolean;
}

export const useTimelineKpis = ({
  timerange,
  filterQuery,
  docValueFields,
  defaultIndex,
  isBlankTimeline,
}: UseTimelineKpiProps): [boolean, TimelineKpiStrategyResponse | null] => {
  const { data } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const searchSubscription$ = useRef(new Subscription());
  const [loading, setLoading] = useState(false);
  const [timelineKpiRequest, setTimelineKpiRequest] = useState<TimelineKpiStrategyRequest | null>(
    null
  );
  const [timelineKpiResponse, setTimelineKpiResponse] =
    useState<TimelineKpiStrategyResponse | null>(null);
  const { addError, addWarning } = useAppToasts();

  const timelineKpiSearch = useCallback(
    (request: TimelineKpiStrategyRequest | null) => {
      if (request == null) {
        return;
      }
      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        searchSubscription$.current = data.search
          .search<TimelineKpiStrategyRequest, TimelineKpiStrategyResponse>(request, {
            strategy: 'timelineSearchStrategy',
            abortSignal: abortCtrl.current.signal,
          })
          .subscribe({
            next: (response) => {
              if (isCompleteResponse(response)) {
                setLoading(false);
                setTimelineKpiResponse(response);
                searchSubscription$.current.unsubscribe();
              } else if (isErrorResponse(response)) {
                setLoading(false);
                addWarning(i18n.FAIL_TIMELINE_KPI_DETAILS);
                searchSubscription$.current.unsubscribe();
              }
            },
            error: (msg) => {
              setLoading(false);
              addError(msg, { title: i18n.FAIL_TIMELINE_KPI_SEARCH_DETAILS });
              searchSubscription$.current.unsubscribe();
            },
          });
      };
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
      asyncSearch();
      refetch.current = asyncSearch;
    },
    [data.search, addError, addWarning]
  );

  useEffect(() => {
    setTimelineKpiRequest((prevRequest) => {
      const myRequest = {
        ...(prevRequest ?? {}),
        docValueFields,
        defaultIndex,
        timerange,
        filterQuery,
        factoryQueryType: TimelineEventsQueries.kpi,
      };
      if (!deepEqual(prevRequest, myRequest)) {
        return myRequest;
      }
      return prevRequest;
    });
  }, [docValueFields, defaultIndex, timerange, filterQuery]);

  useEffect(() => {
    if (!isBlankTimeline) {
      timelineKpiSearch(timelineKpiRequest);
    } else {
      setLoading(false);
      setTimelineKpiResponse(null);
    }
    return () => {
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
    };
  }, [isBlankTimeline, timelineKpiRequest, timelineKpiSearch]);
  return [loading, timelineKpiResponse];
};
