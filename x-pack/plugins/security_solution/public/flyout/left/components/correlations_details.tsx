/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo, useReducer } from 'react';
import {
  Criteria,
  EuiBasicTable,
  EuiInMemoryTable,
  EuiTableSortingType,
  EuiText,
} from '@elastic/eui';
import { useTimelineEventsDetails } from '../../../timelines/containers/details';
import { useSourcererDataView } from '../../../common/containers/sourcerer';
import { CORRELATIONS_DETAILS_TEST_ID } from './test_ids';

import { useCorrelations } from '../../right/hooks/use_correlations';
import { useLeftPanelContext } from '../context';
import { useRouteSpy } from '../../../common/utils/route/use_route_spy';
import { SecurityPageName } from '../../../../common';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';
import { Hit, useAlertsByIds } from '../../../common/containers/alerts/use_alerts_by_ids';
import { EntityPanel } from '../../right/components/entity_panel';

interface AlertsTableProps {
  data: Hit[];
  loading: boolean;
}

const columns = [
  {
    field: '@timestamp',
    name: 'Timestamp',
    truncateText: true,
  },
  {
    field: 'kibana.alert.rule.name',
    name: 'Rule',
    truncateText: true,
  },
  {
    field: 'kibana.alert.reason',
    name: 'Reason',
    truncateText: true,
  },
  {
    field: 'kibana.alert.severity',
    name: 'Severity',
    truncateText: true,
  },
];

const pagination = {
  pageIndex: 0,
  pageSize: 5,
  totalItemCount: 100,
  pageSizeOptions: [3, 5, 8],
};

const sorting: EuiTableSortingType<Record<string, unknown>> = {
  sort: {
    field: '@timestamp',
    direction: 'desc',
  },
  enableAllColumns: true,
  readOnly: true,
};

const AlertsTable: FC<AlertsTableProps> = ({ data, loading }) => {
  // const [sorting, setSorting] = useReducer(() => {
  //   return {};
  // }, {});
  //
  // const [pagination, setPagination] = useReducer(() => {
  //   return {};
  // }, {});

  const onTableChange = ({ page, sort }: Criteria<Record<string, unknown>>) => {
    if (page) {
      const { index: pageIndex, size: pageSize } = page;
      // setPageIndex(pageIndex);
      // setPageSize(pageSize);
    }
    if (sort) {
      const { field: sortField, direction: sortDirection } = sort;
      // setSortField(sortField);
      // setSortDirection(sortDirection);
    }
  };

  const mappedData = useMemo(() => {
    return data
      .map((hit) => hit.fields)
      .map((fields) =>
        Object.keys(fields).reduce((result, fieldName) => {
          result[fieldName] = fields[fieldName]?.[0] || fields[fieldName];
          return result;
        }, {} as Record<string, unknown>)
      );
  }, [data]);

  return (
    <EuiBasicTable
      loading={loading}
      tableCaption="Demo for EuiBasicTable with sorting"
      items={mappedData}
      columns={columns}
      pagination={pagination}
      sorting={sorting}
      onChange={onTableChange}
    />
  );
};

export const CORRELATIONS_TAB_ID = 'correlations-details';

/**
 * Correlations displayed in the document details expandable flyout left section under the Insights tab
 */
export const CorrelationsDetails: React.FC = () => {
  const { indexName, eventId } = useLeftPanelContext();

  const scopeId = 'flyout'; // TODO: update to use context

  // TODO: move this to a separate hook
  const [{ pageName }] = useRouteSpy();
  const sourcererScope =
    pageName === SecurityPageName.detections
      ? SourcererScopeName.detections
      : SourcererScopeName.default;

  const sourcererDataView = useSourcererDataView(sourcererScope);

  const [isEventDataLoading, eventData, _searchHit, dataAsNestedObject] = useTimelineEventsDetails({
    indexName,
    eventId,
    runtimeMappings: sourcererDataView.runtimeMappings,
    skip: !eventId,
  });

  const {
    loading: isCorrelationsLoading,
    error: correlationsError,
    data: correlationsData,
    ancestryAlertsIds,
    alertsBySessionIds,
    sameSourceAlertsIds,
  } = useCorrelations({
    eventId,
    dataAsNestedObject,
    dataFormattedForFieldBrowser: eventData,
    scopeId,
  });

  console.log('correlationsData', { ancestryAlertsIds, alertsBySessionIds, sameSourceAlertsIds });

  const {
    data: ancestryAlerts,
    loading: isAncestryAlertsLoading,
    error: ancestryAlertsError,
  } = useAlertsByIds({ alertIds: ancestryAlertsIds });

  const {
    data: sessionAlerts,
    loading: isSessionAlertsLoading,
    error: sessionAlertsError,
  } = useAlertsByIds({ alertIds: alertsBySessionIds });

  const {
    data: sameSourceAlerts,
    loading: isSameSourceAlertsLoading,
    error: sameSourceAlertsError,
  } = useAlertsByIds({ alertIds: sameSourceAlertsIds });

  return (
    <>
      <EntityPanel title={'Ancestry'} iconType={''} expandable={true}>
        <AlertsTable loading={isAncestryAlertsLoading} data={ancestryAlerts} />
      </EntityPanel>

      <EntityPanel title={'Ancestry'} iconType={''}>
        <AlertsTable loading={isSameSourceAlertsLoading} data={sameSourceAlerts} />
      </EntityPanel>

      <EntityPanel title={'Ancestry'} iconType={''}>
        <AlertsTable loading={isSessionAlertsLoading} data={sessionAlerts} />
      </EntityPanel>
    </>
  );
};

CorrelationsDetails.displayName = 'CorrelationsDetails';
