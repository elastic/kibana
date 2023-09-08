/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useMemo } from 'react';
import type { TimelineItem } from '@kbn/timelines-plugin/common';
import {
  useTimelineEvents,
  type TimelineArgs,
  type UseTimelineEventsProps,
} from './use_timelines_events';

type UseDataTable = [
  boolean,
  Omit<TimelineArgs, 'loadPage' | 'events'> & { rows: TimelineItem[]; loadMore: () => void }
];

export const useDataTableRows = (props: UseTimelineEventsProps): UseDataTable => {
  const [loading, result] = useTimelineEvents(props);
  const { events, loadPage, pageInfo, ...rest } = result;

  const [pageRows, setPageRows] = useState<TimelineItem[][]>([]);

  const loadMore = () => {
    loadPage(pageInfo.activePage + 1);
  };

  useEffect(() => {
    setPageRows((currentPageRows) => {
      if (currentPageRows[pageInfo.activePage]?.length) {
        return currentPageRows;
      }
      const newPageRows = [...currentPageRows];
      newPageRows[pageInfo.activePage] = events;
      return newPageRows;
    });
  }, [events, pageInfo.activePage]);

  const rows = useMemo(() => pageRows.flat(), [pageRows]);

  return [loading, { ...rest, rows, loadMore, pageInfo }];
};
