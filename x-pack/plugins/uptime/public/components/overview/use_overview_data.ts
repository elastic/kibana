/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMonitorList } from './monitor_list/use_monitor_list';
import { useFilterGroup } from './filter_group/use_filter_group';
import { useSnapshot } from './snapshot/use_snapshot';
import { usePingHistogram } from '../monitor/ping_histogram/use_ping_histogram';
import { useIndexPattern } from './kuery_bar/use_index_pattern';

interface Props {
  pageSize: number;
  esKueryFilters?: string;
}
export const useOverviewPageData = ({ pageSize, esKueryFilters }: Props) => {
  // loads monitor list first, that's the heavy request
  useMonitorList({ pageSize, esKueryFilters });
  useSnapshot();
  usePingHistogram();
  useFilterGroup({ esKueryFilters });
  useIndexPattern();
};
