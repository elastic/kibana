/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useState } from 'react';
import { useInfiniteQuery } from 'react-query';
import { EuiSearchBarOnChangeArgs } from '@elastic/eui';
import { CoreStart } from 'kibana/public';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { ProcessEvent, ProcessEventResults } from '../../../common/types/process_tree';
import { PROCESS_EVENTS_ROUTE, PROCESS_EVENTS_PER_PAGE } from '../../../common/constants';

export const useFetchSessionViewProcessEvents = (
  sessionEntityId: string,
  jumpToEvent: ProcessEvent | undefined
) => {
  const { http } = useKibana<CoreStart>().services;
  const [isJumpToFirstPage, setIsJumpToFirstPage] = useState<boolean>(false);
  const jumpToCursor = jumpToEvent && jumpToEvent.process.start;

  const query = useInfiniteQuery(
    'sessionViewProcessEvents',
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
      getNextPageParam: (lastPage, pages) => {
        if (lastPage.events.length === PROCESS_EVENTS_PER_PAGE) {
          return {
            cursor: lastPage.events[lastPage.events.length - 1]['@timestamp'],
            forward: true,
          };
        }
      },
      getPreviousPageParam: (firstPage, pages) => {
        if (jumpToEvent && firstPage.events.length === PROCESS_EVENTS_PER_PAGE) {
          return {
            cursor: firstPage.events[0]['@timestamp'],
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
