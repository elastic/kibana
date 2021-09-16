/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiText } from '@elastic/eui';
import { MonitorPageLink } from '../../../common/monitor_page_link';
import { useGetUrlParams } from '../../../../hooks';
import { stringifyUrlParams } from '../../../../lib/helper/stringify_url_params';
import { MonitorSummary } from '../../../../../common/runtime_types/monitor';
import { useFilterUpdate } from '../../../../hooks/use_filter_update';

interface Props {
  summary: MonitorSummary;
}

export const parseCurrentFilters = (filters: string) => {
  let parsedFilters: Map<string, string[]>;
  try {
    parsedFilters = new Map<string, string[]>(JSON.parse(filters));
  } catch {
    parsedFilters = new Map<string, string[]>();
  }
  return parsedFilters;
};

const MONITOR_TYPES: Record<string, string> = {
  browser: 'Browser',
  http: 'HTTP Ping',
  tcp: 'TCP Ping',
  icmp: 'ICMP Ping',
};

export const MonitorNameColumn = ({ summary }: Props) => {
  const params = useGetUrlParams();

  const linkParameters = stringifyUrlParams(params, true);

  const currFilters = parseCurrentFilters(params.filters);

  const [filterType, setFilterType] = useState<string[]>(currFilters.get('monitor.type') ?? []);

  const excludedTypeFilters = useMemo(() => {
    const currExcludedFilters = parseCurrentFilters(params.excludedFilters);
    return currExcludedFilters.get('monitor.type') ?? [];
  }, [params.excludedFilters]);

  useFilterUpdate('monitor.type', filterType, excludedTypeFilters);

  const filterLabel = i18n.translate('xpack.uptime.monitorList.monitorType.filter', {
    defaultMessage: 'Filter all monitors with type {type}',
    values: {
      type: summary.state.monitor.type,
    },
  });

  return (
    <div>
      <MonitorPageLink monitorId={summary.monitor_id} linkParameters={linkParameters}>
        {summary.state.monitor.name
          ? summary.state.monitor.name
          : `Unnamed - ${summary.monitor_id}`}
      </MonitorPageLink>
      <div>
        <EuiButtonEmpty
          color="text"
          title={filterLabel}
          onClick={() => {
            setFilterType([summary.state.monitor.type]);
          }}
          size="xs"
          flush="left"
          style={{ border: 'none' }}
        >
          <EuiText size="xs">{MONITOR_TYPES[summary.state.monitor.type]}</EuiText>
        </EuiButtonEmpty>
      </div>
    </div>
  );
};
