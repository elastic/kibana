/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState, FC, useCallback, useMemo, useRef } from 'react';
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
  EuiProgress,
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
import { useTableState } from './use_table_state';

interface Props {
  spacesApi?: SpacesPluginStart;
  setCurrentTab: (tabId: MlSavedObjectType) => void;
}

export const SpaceManagement: FC<Props> = ({ spacesApi, setCurrentTab }) => {
  const { getList } = useManagementApiService();
  const [currentTabId, setCurrentTabId] = useState<MlSavedObjectType>('anomaly-detector');
  const [items, setItems] = useState<ManagementListResponse>();
  const [columns, setColumns] = useState<Array<EuiBasicTableColumn<ManagementItems>>>([]);
  const [filters, setFilters] = useState<SearchFilterConfig[] | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const { onTableChange, pagination, sorting, setPageIndex } = useTableState<ManagementItems>(
    items ?? [],
    'id'
  );

  const isMounted = useRef(true);
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const loadingTab = useRef<MlSavedObjectType | null>(null);
  const refresh = useCallback(
    (tabId: MlSavedObjectType) => {
      loadingTab.current = tabId;
      setIsLoading(true);
      getList(tabId)
        .then((jobList) => {
          if (isMounted.current && tabId === loadingTab.current) {
            setItems(jobList);
            setIsLoading(false);
            setFilters(getFilters(tabId, jobList));
          }
        })
        .catch(() => {
          if (isMounted.current) {
            setItems([]);
            setFilters(undefined);
            setIsLoading(false);
          }
        });
    },
    [getList, loadingTab]
  );

  useEffect(
    function refreshOnTabChange() {
      setItems(undefined);
      setColumns(createColumns());
      setCurrentTab(currentTabId);
      refresh(currentTabId);
      setPageIndex(0);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
              align: 'right',
              width: '10%',
              render: (item: ManagementItems) => {
                return (
                  <MLSavedObjectsSpacesList
                    spacesApi={spacesApi}
                    spaceIds={item.spaces ?? []}
                    id={item.id}
                    mlSavedObjectType={currentTabId}
                    refresh={refresh.bind(null, currentTabId)}
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
        {isLoading ? <EuiProgress size="xs" color="accent" /> : null}

        <EuiSpacer size="m" />
        {items === undefined ? null : (
          <>
            <EuiFlexGroup justifyContent={'flexEnd'} gutterSize={'none'}>
              <EuiFlexItem grow={false}>
                <RefreshButton
                  onRefreshClick={refresh.bind(null, currentTabId)}
                  isRefreshing={isLoading}
                />
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
              onTableChange={onTableChange}
              pagination={pagination}
              sorting={sorting}
              rowProps={(item) => ({
                'data-test-subj': `mlSpacesManagementTable-${currentTabId} row-${item.id}`,
              })}
            />
          </>
        )}
      </>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, columns, isLoading, filters, currentTabId, refresh, onTableChange]);

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
    iconType={'refresh'}
    iconSide={'left'}
    iconSize={'m'}
  >
    <FormattedMessage id="xpack.ml.management.list.refreshButtonLabel" defaultMessage="Refresh" />
  </EuiButtonEmpty>
);
