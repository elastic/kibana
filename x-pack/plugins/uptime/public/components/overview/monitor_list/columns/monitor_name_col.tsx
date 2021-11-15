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
import { MonitorSavedObject } from '../../../../../common/types';
import { getMonitorObject } from '../actions/list_actions';

interface Props {
  monitorId: string;
  summary: MonitorSummary;
  monitorListObjects: MonitorSavedObject[];
  monitorSavedObject: MonitorSavedObject;
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

export const MonitorNameColumn = ({
  monitorId,
  summary,
  monitorSavedObject,
  monitorListObjects,
}: Props) => {
  const objMonitor = getMonitorObject(monitorId, monitorListObjects);

  let monitorName = '';
  let monitorType = '';
  if (summary.state) {
    monitorName = summary.state.monitor.name;
    monitorType = summary.state.monitor.type;
  } else {
    monitorName = objMonitor?.attributes.name;
    monitorType = objMonitor?.attributes.type;
  }

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
      type: monitorType,
    },
  });

  return (
    <div>
      <MonitorPageLink monitorId={monitorId} linkParameters={linkParameters}>
        {monitorName ? monitorName : `Unnamed - ${monitorId}`}
      </MonitorPageLink>
      <div>
        <EuiButtonEmpty
          color="text"
          title={filterLabel}
          onClick={() => {
            setFilterType([monitorType]);
          }}
          size="xs"
          flush="left"
          style={{ border: 'none' }}
        >
          <EuiText size="xs">{MONITOR_TYPES[monitorType]}</EuiText>
        </EuiButtonEmpty>
      </div>
    </div>
  );
};
