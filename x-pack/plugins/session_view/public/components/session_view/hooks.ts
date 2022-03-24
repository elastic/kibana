/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useState } from 'react';
import { useQuery, useInfiniteQuery } from 'react-query';
import { EuiSearchBarOnChangeArgs } from '@elastic/eui';
import { CoreStart } from 'kibana/public';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import {
  AlertStatusEventEntityIdMap,
  ProcessEvent,
  ProcessEventResults,
} from '../../../common/types/process_tree';
import {
  ALERTS_ROUTE,
  PROCESS_EVENTS_ROUTE,
  PROCESS_EVENTS_PER_PAGE,
  ALERT_STATUS_ROUTE,
  QUERY_KEY_PROCESS_EVENTS,
  QUERY_KEY_ALERTS,
} from '../../../common/constants';

export const useFetchSessionViewProcessEvents = (
  sessionEntityId: string,
  jumpToEvent: ProcessEvent | undefined
) => {
  const { http } = useKibana<CoreStart>().services;
  const [isJumpToFirstPage, setIsJumpToFirstPage] = useState<boolean>(false);
  const jumpToCursor = jumpToEvent && jumpToEvent.process.start;
  const cachingKeys = [QUERY_KEY_PROCESS_EVENTS, sessionEntityId];

  const query = useInfiniteQuery(
    cachingKeys,
    async ({ pageParam = {} }) => {
      let { cursor } = pageParam;
      const { forward } = pageParam;

      if (!cursor && jumpToCursor) {
        cursor = jumpToCursor;
      }

      const res = await http.get<ProcessEventResults>(PROCESS_EVENTS_ROUTE, {
        query: {
          sessionEntityId,
          cursor,
          forward,
        },
      });

      const events = res.events.map((event: any) => event._source as ProcessEvent);

      return { events, cursor };
    },
    {
      getNextPageParam: (lastPage) => {
        if (lastPage.events.length === PROCESS_EVENTS_PER_PAGE) {
          return {
            cursor: lastPage.events[lastPage.events.length - 1].process.start,
            forward: true,
          };
        }
      },
      getPreviousPageParam: (firstPage) => {
        if (jumpToEvent && firstPage.events.length === PROCESS_EVENTS_PER_PAGE) {
          return {
            cursor: firstPage.events[0].process.start,
            forward: false,
          };
        }
      },
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    }
  );

  useEffect(() => {
    if (jumpToEvent && query.data?.pages.length === 1 && !isJumpToFirstPage) {
      query.fetchPreviousPage({ cancelRefetch: true });
      setIsJumpToFirstPage(true);
    }
  }, [jumpToEvent, query, isJumpToFirstPage]);

  return query;
};

export const useFetchSessionViewAlerts = (sessionEntityId: string) => {
  const { http } = useKibana<CoreStart>().services;
  const cachingKeys = [QUERY_KEY_ALERTS, sessionEntityId];
  const query = useQuery(
    cachingKeys,
    async () => {
      const res = await http.get<ProcessEventResults>(ALERTS_ROUTE, {
        query: {
          sessionEntityId,
        },
      });

      const events = res.events.map((event: any) => event._source as ProcessEvent);

      return events;
    },
    {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    }
  );

  return query;
};

export const useFetchAlertStatus = (
  updatedAlertsStatus: AlertStatusEventEntityIdMap,
  alertUuid: string
) => {
  const { http } = useKibana<CoreStart>().services;
  const cachingKeys = [QUERY_KEY_ALERTS, alertUuid];
  const query = useQuery<AlertStatusEventEntityIdMap, Error>(
    cachingKeys,
    async () => {
      if (!alertUuid) {
        return updatedAlertsStatus;
      }

      const res = await http.get<ProcessEventResults>(ALERT_STATUS_ROUTE, {
        query: {
          alertUuid,
        },
      });

      // TODO: add error handling
      const events = res.events.map((event: any) => event._source as ProcessEvent);

      return {
        ...updatedAlertsStatus,
        [alertUuid]: {
          status: events[0]?.kibana?.alert.workflow_status ?? '',
          processEntityId: events[0]?.process?.entity_id ?? '',
        },
      };
    },
    {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    }
  );

  return query;
};

export const useSearchQuery = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const onSearch = ({ query }: EuiSearchBarOnChangeArgs) => {
    if (query) {
      setSearchQuery(query.text);
    } else {
      setSearchQuery('');
    }
  };

  return {
    searchQuery,
    onSearch,
  };
};
