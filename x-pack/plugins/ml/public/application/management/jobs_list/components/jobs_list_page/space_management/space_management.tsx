/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState, FC, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButtonEmpty,
  EuiSpacer,
  EuiTabbedContent,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  SearchFilterConfig,
  EuiBasicTableColumn,
} from '@elastic/eui';

import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { JobType, MlSavedObjectType } from '../../../../../../../common/types/saved_objects';
import type {
  ManagementListResponse,
  ManagementItems,
} from '../../../../../../../common/types/management';
import { useManagementApiService } from '../../../../../services/ml_api_service/management';
import { getColumns } from './columns';
import { MLSavedObjectsSpacesList } from '../../../../../components/ml_saved_objects_spaces_list';
import { getFilters } from './filters';

interface Props {
  spacesApi: SpacesPluginStart | undefined;
  setCurrentTab: (tabId: MlSavedObjectType) => void;
}

export const SpaceManagement: FC<Props> = ({ spacesApi, setCurrentTab }) => {
  const { getList } = useManagementApiService();
  const [currentTabId, setCurrentTabId] = useState<MlSavedObjectType>('anomaly-detector');
  const [items, setItems] = useState<ManagementListResponse>();
  const [columns, setColumns] = useState<Array<EuiBasicTableColumn<ManagementItems>>>([]);
  const [filters, setFilters] = useState<SearchFilterConfig[] | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(() => {
    setIsLoading(true);
    getList(currentTabId)
      .then((jobList) => {
        setItems(jobList);
        setIsLoading(false);
        setFilters(getFilters(currentTabId, jobList));
      })
      .catch(() => {
        setItems([]);
        setFilters(undefined);
        setIsLoading(false);
      });
  }, [getList, currentTabId]);

  useEffect(
    function refreshOnTabChange() {
      setItems(undefined);
      setColumns(createColumns());
      setCurrentTab(currentTabId);
      refresh();
    },
    [currentTabId]
  );

  const createColumns = useCallback(() => {
    return [
      ...getColumns(currentTabId),
      ...(spacesApi !== undefined
        ? [
            {
              name: i18n.translate('xpack.ml.management.spaceManagementTableColumn.spaces', {
                defaultMessage: 'spaces',
              }),
              'data-test-subj': 'mlSpaceManagementTableColumnSpaces',
              sortable: true,
              truncateText: true,
              render: (item: ManagementItems) => {
                return (
                  <MLSavedObjectsSpacesList
                    spacesApi={spacesApi}
                    spaceIds={item.spaces ?? []}
                    id={item.id}
                    mlSavedObjectType={currentTabId}
                    refresh={refresh}
                  />
                );
              },
            },
          ]
        : []),
    ] as Array<EuiBasicTableColumn<ManagementItems>>;
  }, [currentTabId, spacesApi, refresh]);

  const getTable = useCallback(() => {
    return (
      <>
        <EuiSpacer size="m" />
        {items === undefined ? null : (
          <>
            <EuiFlexGroup>
              <EuiFlexItem />
              <EuiFlexItem grow={false}>
                <RefreshButton onRefreshClick={refresh} isRefreshing={isLoading} />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiInMemoryTable<ManagementItems>
              data-test-subj={`mlSpacesManagementTable-${currentTabId} ${
                isLoading ? 'loading' : 'loaded'
              }`}
              items={items}
              columns={columns}
              search={{
                box: {
                  incremental: true,
                },
                filters,
              }}
              pagination={{
                pageSizeOptions: [10, 25, 50],
              }}
              sorting={{
                sort: {
                  field: 'id',
                  direction: 'asc',
                },
              }}
              rowProps={(item) => ({
                'data-test-subj': `mlSpacesManagementTable-${currentTabId} row-${item.id}`,
              })}
            />
          </>
        )}
      </>
    );
  }, [items, columns, isLoading, filters]);

  const tabs = useMemo(
    () => [
      {
        'data-test-subj': 'mlStackManagementAnomalyDetectionTab',
        id: 'anomaly-detector',
        name: i18n.translate('xpack.ml.management.list.anomalyDetectionTab', {
          defaultMessage: 'Anomaly detection',
        }),
        content: getTable(),
      },
      {
        'data-test-subj': 'mlStackManagementAnalyticsTab',
        id: 'data-frame-analytics',
        name: i18n.translate('xpack.ml.management.list.analyticsTab', {
          defaultMessage: 'Analytics',
        }),
        content: getTable(),
      },
      {
        'data-test-subj': 'mlStackManagementTrainedModelsTab',
        id: 'trained-model',
        name: i18n.translate('xpack.ml.management.list.trainedModelsTab', {
          defaultMessage: 'Trained models',
        }),
        content: getTable(),
      },
    ],
    [getTable]
  );

  return (
    <EuiTabbedContent
      data-test-subj="mlSpacesManagementTable"
      onTabClick={({ id }: { id: string }) => {
        setCurrentTabId(id as JobType);
      }}
      size="s"
      tabs={tabs}
      initialSelectedTab={tabs[0]}
    />
  );
};

export const RefreshButton: FC<{ onRefreshClick: () => void; isRefreshing: boolean }> = ({
  onRefreshClick,
  isRefreshing,
}) => (
  <EuiButtonEmpty
    data-test-subj={`mlRefreshJobListButton${isRefreshing ? ' loading' : ' loaded'}`}
    onClick={onRefreshClick}
    isLoading={isRefreshing}
  >
    <FormattedMessage id="xpack.ml.management.list.refreshButtonLabel" defaultMessage="Refresh" />
  </EuiButtonEmpty>
);
