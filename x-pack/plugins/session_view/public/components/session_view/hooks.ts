/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useState, useMemo } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { EuiSearchBarOnChangeArgs } from '@elastic/eui';
import { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  AlertStatusEventEntityIdMap,
  EventAction,
  ProcessEvent,
  ProcessEventResults,
} from '../../../common/types/process_tree';
import {
  ALERTS_ROUTE,
  PROCESS_EVENTS_ROUTE,
  PROCESS_EVENTS_PER_PAGE,
  ALERTS_PER_PAGE,
  ALERT_STATUS_ROUTE,
  GET_TOTAL_IO_BYTES_ROUTE,
  QUERY_KEY_PROCESS_EVENTS,
  QUERY_KEY_ALERTS,
  QUERY_KEY_GET_TOTAL_IO_BYTES,
} from '../../../common/constants';

export const useFetchSessionViewProcessEvents = (
  index: string,
  sessionEntityId: string,
  sessionStartTime: string,
  jumpToCursor?: string
) => {
  const { http } = useKibana<CoreStart>().services;
  const [currentJumpToCursor, setCurrentJumpToCursor] = useState<string>('');
  const cachingKeys = useMemo(
    () => [QUERY_KEY_PROCESS_EVENTS, index, sessionEntityId, jumpToCursor],
    [index, sessionEntityId, jumpToCursor]
  );

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
          index,
          sessionEntityId,
          sessionStartTime,
          cursor,
          forward,
        },
      });

      const events = res.events?.map((event: any) => event._source as ProcessEvent) ?? [];

      return { events, cursor, total: res.total };
    },
    {
      getNextPageParam: (lastPage, pages) => {
        const isRefetch = pages.length === 1 && jumpToCursor;
        if (isRefetch || lastPage.events.length >= PROCESS_EVENTS_PER_PAGE) {
          const filtered = lastPage.events.filter((event) => {
            const action = event.event?.action;
            return (
              action &&
              (action.includes(EventAction.fork) ||
                action.includes(EventAction.exec) ||
                action.includes(EventAction.end))
            );
          });

          const cursor = filtered?.[filtered.length - 1]?.['@timestamp'];

          if (cursor) {
            return {
              cursor,
              forward: true,
            };
          }
        }
      },
      getPreviousPageParam: (firstPage, pages) => {
        const filtered = firstPage.events.filter((event) => {
          const action = event.event?.action;
          return (
            action &&
            (action.includes(EventAction.fork) ||
              action.includes(EventAction.exec) ||
              action.includes(EventAction.end))
          );
        });

        const atBeginning = pages.length > 1 && filtered.length < PROCESS_EVENTS_PER_PAGE;

        if (jumpToCursor && !atBeginning) {
          // it's possible the first page returned no events
          // fallback to using jumpToCursor if there are no "forward" events.
          const cursor = filtered[0]?.['@timestamp'] || jumpToCursor;

          return {
            cursor,
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
    if (jumpToCursor && query.data?.pages.length === 1 && jumpToCursor !== currentJumpToCursor) {
      query.fetchPreviousPage({ cancelRefetch: true });
      setCurrentJumpToCursor(jumpToCursor);
    }
  }, [jumpToCursor, query, currentJumpToCursor]);

  return query;
};

export const useFetchSessionViewAlerts = (
  sessionEntityId: string,
  sessionStartTime: string,
  investigatedAlertId?: string
) => {
  const { http } = useKibana<CoreStart>().services;
  const cachingKeys = [QUERY_KEY_ALERTS, sessionEntityId, investigatedAlertId];

  const query = useInfiniteQuery(
    cachingKeys,
    async ({ pageParam = {} }) => {
      const { cursor } = pageParam;

      const res = await http.get<ProcessEventResults>(ALERTS_ROUTE, {
        query: {
          sessionEntityId,
          sessionStartTime,
          investigatedAlertId,
          cursor,
        },
      });

      const events = res.events?.map((event: any) => event._source as ProcessEvent) ?? [];

      return {
        events,
        cursor,
        total: res.total,
      };
    },
    {
      getNextPageParam: (lastPage) => {
        if (lastPage.events.length >= ALERTS_PER_PAGE) {
          return {
            cursor: lastPage.events[lastPage.events.length - 1]['@timestamp'],
          };
        }
      },
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
      const events = res.events?.map((event: any) => event._source as ProcessEvent) ?? [];

      return {
        ...updatedAlertsStatus,
        [alertUuid]: {
          status: events[0]?.kibana?.alert?.workflow_status ?? '',
          processEntityId: events[0]?.process?.entity_id ?? '',
        },
      };
    },
    {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      cacheTime: 0,
    }
  );

  return query;
};

export const useFetchGetTotalIOBytes = (
  index: string,
  sessionEntityId: string,
  sessionStartTime: string
) => {
  const { http } = useKibana<CoreStart>().services;
  const cachingKeys = [QUERY_KEY_GET_TOTAL_IO_BYTES, index, sessionEntityId];
  const query = useQuery<{ total: number }, Error>(
    cachingKeys,
    async () => {
      return http.get<{ total: number }>(GET_TOTAL_IO_BYTES_ROUTE, {
        query: {
          index,
          sessionEntityId,
          sessionStartTime,
        },
      });
    },
    {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      cacheTime: 0,
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
