/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState, FC, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButtonEmpty,
  EuiSpacer,
  EuiTabbedContent,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
} from '@elastic/eui';

import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { HttpService } from '../../../../../services/http_service';
import type { JobType, MlSavedObjectType } from '../../../../../../../common/types/saved_objects';
import type { AnomalyDetectionManagementItems } from '../../../../../../../common/types/management';
import { managementApiProvider } from '../../../../../services/ml_api_service/management';
import { getColumns } from './columns';
import { MLSavedObjectsSpacesList } from '../../../../../components/ml_saved_objects_spaces_list';

interface Props {
  isMlEnabledInSpace: boolean;
  spacesApi: SpacesPluginStart | undefined;
  httpService: HttpService;
  setCurrentTab: (tabId: MlSavedObjectType) => void;
}

export const SpaceManagement: FC<Props> = ({
  isMlEnabledInSpace,
  spacesApi,
  httpService,
  setCurrentTab,
}) => {
  const { getList } = managementApiProvider(httpService);
  const [currentTabId, setCurrentTabId] = useState<MlSavedObjectType>('anomaly-detector');
  const [jobs, setJobs] = useState<AnomalyDetectionManagementItems[]>();
  const [columns, setColumns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(() => {
    setIsLoading(true);
    getList(currentTabId)
      .then((jobList) => {
        setJobs(jobList);
        setIsLoading(false);
      })
      .catch(() => {
        // console.log('error error');
        setJobs([]);
        setIsLoading(false);
      });
  }, [getList, currentTabId]);

  useEffect(() => {
    setJobs(undefined);
    setColumns(createColumns());
    setCurrentTab(currentTabId);
    refresh();
  }, [currentTabId]);

  const createColumns = useCallback(() => {
    return [
      ...getColumns(currentTabId),
      ...(spacesApi !== undefined
        ? [
            {
              name: i18n.translate('xpack.ml.analyticsSelector.destinationIndex', {
                defaultMessage: 'spaces',
              }),
              sortable: true,
              truncateText: true,
              render: (item: any) => {
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
    ];
  }, [currentTabId, spacesApi, refresh]);

  // const search: EuiSearchBarProps = {
  //   query: searchQueryText,
  //   onChange: handleSearchOnChange,
  //   box: {
  //     incremental: true,
  //   },
  //   filters,
  // };

  const getTable = useCallback(() => {
    return (
      <>
        <EuiSpacer size="m" />
        {jobs === undefined ? null : (
          <>
            <EuiFlexGroup>
              <EuiFlexItem />
              <EuiFlexItem grow={false}>
                <RefreshButton onRefreshClick={refresh} isRefreshing={isLoading} />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiInMemoryTable
              items={jobs}
              columns={columns}
              pagination={{
                pageSizeOptions: [10, 25, 50],
              }}
              sorting={{
                sort: {
                  field: 'id',
                  direction: 'asc',
                },
              }}
            />
          </>
        )}
      </>
    );
  }, [jobs, columns, isLoading]);

  const tabs = [
    {
      'data-test-subj': 'mlStackManagementJobsListAnomalyDetectionTab',
      id: 'anomaly-detector',
      name: i18n.translate('xpack.ml.management.jobsList.anomalyDetectionTab', {
        defaultMessage: 'Anomaly detection',
      }),
      content: getTable(),
    },
    {
      'data-test-subj': 'mlStackManagementJobsListAnalyticsTab',
      id: 'data-frame-analytics',
      name: i18n.translate('xpack.ml.management.jobsList.analyticsTab', {
        defaultMessage: 'Analytics',
      }),
      content: getTable(),
    },
    {
      'data-test-subj': 'mlStackManagementJobsListAnalyticsTab',
      id: 'trained-model',
      name: i18n.translate('xpack.ml.management.jobsList.trainedModelsTab', {
        defaultMessage: 'Trained models',
      }),
      content: getTable(),
    },
  ];

  return (
    <>
      <EuiTabbedContent
        onTabClick={({ id }: { id: string }) => {
          setCurrentTabId(id as JobType);
        }}
        size="s"
        tabs={tabs}
        initialSelectedTab={tabs[0]}
      />
    </>
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
    <FormattedMessage id="xpack.ml.jobsList.refreshButtonLabel" defaultMessage="Refresh" />
  </EuiButtonEmpty>
);
