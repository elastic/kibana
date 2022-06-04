/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';
import { useInfiniteQuery } from 'react-query';
import { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { IOLine, ProcessEvent, ProcessEventResults, ProcessEventsPage } from '../../../common/types/process_tree';
import {
  IO_EVENTS_ROUTE,
  IO_EVENTS_PER_PAGE,
  QUERY_KEY_IO_EVENTS,
} from '../../../common/constants';

export const useFetchIOEvents = (sessionEntityId: string) => {
  const { http } = useKibana<CoreStart>().services;
  const cachingKeys = useMemo(() => [QUERY_KEY_IO_EVENTS, sessionEntityId], [sessionEntityId]);

  const query = useInfiniteQuery(
    cachingKeys,
    async ({ pageParam = {} }) => {
      const { cursor } = pageParam;
      const res = await http.get<ProcessEventResults>(IO_EVENTS_ROUTE, {
        query: {
          sessionEntityId,
          cursor,
        },
      });

      const events = res.events?.map((event: any) => event._source as ProcessEvent) ?? [];

      return { events, cursor, total: res.total };
    },
    {
      getNextPageParam: (lastPage) => {
        if (lastPage.events.length >= IO_EVENTS_PER_PAGE) {
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

/**
 * flattens all pages of IO events into an array of lines
 * note: not efficient currently, tracking a page cursor to avoid redoing work is needed.
 */
export const useIOLines = (pages: ProcessEventsPage[] | undefined) => {
  const lines: IOLine[] = useMemo(() => {
    const lines: IOLine[] = [];

    if (!pages) {
      return lines;
    }

    return pages.reduce((previous, current) => {
      if (current.events) {
        current.events.forEach((event) => {
          if (event?.process?.io?.data) {
            const data: IOLine[] = event.process.io.data;

            previous = previous.concat(data);
          }
        });
      }

      return previous;
    }, lines);
  }, [pages?.length]);

  return lines;
};
