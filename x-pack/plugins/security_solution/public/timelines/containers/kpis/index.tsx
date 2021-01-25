/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty, noop } from 'lodash/fp';
import { useCallback, useEffect, useRef, useState } from 'react';
import deepEqual from 'fast-deep-equal';

import { inputsModel } from '../../../common/store';
import { useKibana } from '../../../common/lib/kibana';
import {
  DocValueFields,
  TimelineEventsQueries,
  TimelineRequestBasicOptions,
  TimelineKpiStrategyResponse,
  TimerangeInput,
} from '../../../../common/search_strategy';
import { ESQuery } from '../../../../common/typed_json';
import { isCompleteResponse, isErrorResponse } from '../../../../../../../src/plugins/data/public';
import { AbortError } from '../../../../../../../src/plugins/kibana_utils/common';

export interface UseTimelineKpiProps {
  timerange: TimerangeInput;
  filterQuery?: ESQuery | string | undefined;
  defaultIndex: string[];
  docValueFields?: DocValueFields[];
  skip: boolean;
  isBlankTimeline: boolean;
}

export const useTimelineKpis = ({
  timerange,
  filterQuery,
  docValueFields,
  defaultIndex,
  skip,
  isBlankTimeline,
}: UseTimelineKpiProps): [boolean, TimelineKpiStrategyResponse | null] => {
  const { data, notifications } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const [loading, setLoading] = useState(false);
  const [timelineKpiRequest, setTimelineKpiRequest] = useState<TimelineRequestBasicOptions | null>(
    null
  );

  const [
    timelineKpiResponse,
    setTimelineKpiResponse,
  ] = useState<TimelineKpiStrategyResponse | null>(null);

  const timelineKpiSearch = useCallback(
    (request: TimelineRequestBasicOptions | null) => {
      if (request == null || skip) {
        return;
      }

      let didCancel = false;
      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        const searchSubscription$ = data.search
          .search<TimelineRequestBasicOptions, TimelineKpiStrategyResponse>(request, {
            strategy: 'securitySolutionTimelineSearchStrategy',
            abortSignal: abortCtrl.current.signal,
          })
          .subscribe({
            next: (response) => {
              if (isCompleteResponse(response)) {
                if (!didCancel) {
                  setLoading(false);
                  setTimelineKpiResponse(response);
                }
                searchSubscription$.unsubscribe();
              } else if (isErrorResponse(response)) {
                if (!didCancel) {
                  setLoading(false);
                }
                // TODO: Make response error status clearer
                notifications.toasts.addWarning('An error has occurred');
                searchSubscription$.unsubscribe();
              }
            },
            error: (msg) => {
              if (!didCancel) {
                setLoading(false);
              }
              if (!(msg instanceof AbortError)) {
                notifications.toasts.addDanger('Failed to load KPIs');
              }
            },
          });
      };
      abortCtrl.current.abort();
      asyncSearch();
      refetch.current = asyncSearch;
      return () => {
        didCancel = true;
        abortCtrl.current.abort();
      };
    },
    [data.search, notifications.toasts, skip]
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
    timelineKpiSearch(timelineKpiRequest);
  }, [timelineKpiRequest, timelineKpiSearch]);
  if (isBlankTimeline) {
    return [false, null];
  } else {
    return [loading, timelineKpiResponse];
  }
};
