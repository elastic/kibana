/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback } from 'react';

import {
  EuiInMemoryTable,
  EuiButton,
  EuiButtonEmpty,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTabbedContent,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import './_index.scss';

import { ml } from '../../../../services/ml_api_service';
import { useTrainedModelsApiService } from '../../../../services/ml_api_service/trained_models';
import {
  DataFrameAnalyticsListColumn,
  DataFrameAnalyticsListRow,
} from '../../analytics_management/components/analytics_list/common';
import { useNotifications } from '../../../../contexts/kibana';

const columns = [
  {
    field: DataFrameAnalyticsListColumn.id,
    name: i18n.translate('xpack.ml.analyticsSelector.id', {
      defaultMessage: 'ID',
    }),
    sortable: (item: DataFrameAnalyticsListRow) => item.id,
    truncateText: true,
    'data-test-subj': 'mlAnalyticsSelectorTableColumnId',
    scope: 'row',
  },
  {
    field: DataFrameAnalyticsListColumn.description,
    name: i18n.translate('xpack.ml.analyticsSelector.description', {
      defaultMessage: 'Description',
    }),
    sortable: true,
    truncateText: true,
    'data-test-subj': 'mlAnalyticsSelectorColumnJobDescription',
  },
  {
    field: 'source.index',
    name: i18n.translate('xpack.ml.analyticsSelector.sourceIndex', {
      defaultMessage: 'Source index',
    }),
    sortable: true,
    truncateText: true,
    'data-test-subj': 'mlAnalyticsSelectorColumnSourceIndex',
  },
  {
    field: 'dest.index',
    name: i18n.translate('xpack.ml.analyticsSelector.destinationIndex', {
      defaultMessage: 'Destination index',
    }),
    sortable: true,
    truncateText: true,
    'data-test-subj': 'mlAnalyticsSelectorColumnDestIndex',
  },
];

const modelColumns = [
  {
    field: 'model_id', // ModelsTableToConfigMapping.id,
    name: i18n.translate('xpack.ml.trainedModels.modelsList.modelIdHeader', {
      defaultMessage: 'ID',
    }),
    sortable: true,
    truncateText: false,
    'data-test-subj': 'mlAnalyticsSelectorColumnId',
  },
];

export function AnalyticsIdSelector({ setAnalyticsId }: any) {
  const [selected, setSelected] = useState<{ model_id?: string; job_id?: string } | undefined>();
  const [analyticsJobs, setAnalyticsJobs] = useState<any[]>([]);
  const [trainedModels, setTrainedModels] = useState<any[]>([]);
  const [isFlyoutVisible, setIsFlyoutVisible] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toasts } = useNotifications();
  const trainedModelsApiService = useTrainedModelsApiService();

  function renderTabs() {
    return <EuiTabbedContent size="s" tabs={tabs} initialSelectedTab={tabs[0]} />;
  }

  async function fetchAnalyticsJobs() {
    setIsLoading(true);
    try {
      const { data_frame_analytics: dataFrameAnalytics } =
        await ml.dataFrameAnalytics.getDataFrameAnalytics();
      setAnalyticsJobs(dataFrameAnalytics);
    } catch (e) {
      console.error('Error fetching analytics', e); // eslint-disable-line
      toasts.addDanger({
        title: i18n.translate('xpack.ml.analyticsSelector.analyticsFetchErrorMessage', {
          defaultMessage: 'An error occurred fetching analytics jobs. Refresh and try again.',
        }),
      });
    }
    setIsLoading(false);
  }

  async function fetchAnalyticsModels() {
    setIsLoading(true);
    try {
      const response = await trainedModelsApiService.getTrainedModels(undefined, {
        size: 1000,
      });
      setTrainedModels(response);
    } catch (e) {
      console.error('Error fetching analytics', e); // eslint-disable-line
      toasts.addDanger({
        title: i18n.translate('xpack.ml.analyticsSelector.trainedModelsFetchErrorMessage', {
          defaultMessage: 'An error occurred fetching trained models. Refresh and try again.',
        }),
      });
    }
    setIsLoading(false);
  }

  function closeFlyout() {
    setIsFlyoutVisible(false);
  }

  // Fetch analytics jobs and models on flyout open
  useEffect(() => {
    fetchAnalyticsJobs();
    fetchAnalyticsModels();
  }, []);

  const applySelection: any = useCallback(() => {
    setAnalyticsId(selected);
    closeFlyout();
  }, [selected?.model_id, selected?.job_id]);

  const pagination = {
    initialPageSize: 5,
    pageSizeOptions: [3, 5, 8],
  };

  const selectionValue = {
    selectable: (item: any) => {
      const selectedId = selected?.job_id || selected?.model_id;
      return selected === undefined || selectedId === item.id || selectedId === item.model_id;
    },
    onSelectionChange: (selectedItem: any) => {
      setSelected({
        model_id: selectedItem[0]?.model_id,
        job_id: selectedItem[0]?.id,
      });
    },
  };

  const tabs = [
    {
      id: 'Jobs',
      name: i18n.translate('xpack.ml.analyticsSelector.jobsTab', {
        defaultMessage: 'Jobs',
      }),
      content: (
        <EuiInMemoryTable
          items={analyticsJobs}
          itemId="id"
          loading={isLoading}
          columns={columns}
          pagination={pagination}
          sorting={true}
          selection={selectionValue}
          isSelectable={true}
        />
      ),
    },
    {
      id: 'Models',
      name: i18n.translate('xpack.ml.analyticsSelector.modelsTab', {
        defaultMessage: 'Models',
      }),
      content: (
        <EuiInMemoryTable
          items={trainedModels}
          itemId="model_id"
          loading={isLoading}
          columns={modelColumns}
          pagination={pagination}
          sorting={true}
          selection={selectionValue}
          isSelectable={true}
        />
      ),
    },
  ];

  return isFlyoutVisible ? (
    <EuiFlyout
      onClose={closeFlyout}
      data-test-subj="mlFlyoutJobSelector"
      aria-labelledby="jobSelectorFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="flyoutTitle">
            {i18n.translate('xpack.ml.analyticsSelector.flyoutTitle', {
              defaultMessage: 'Analytics selection',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody className="mlJobSelectorFlyoutBody" data-test-subj={'mlJobSelectorFlyoutBody'}>
        {renderTabs()}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={applySelection}
              fill
              isDisabled={selected === undefined}
              data-test-subj="mlFlyoutAnalyticsSelectorButtonApply"
            >
              {i18n.translate('xpack.ml.analyticsSelector.applyFlyoutButton', {
                defaultMessage: 'Apply',
              })}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="cross"
              onClick={closeFlyout}
              data-test-subj="mlFlyoutAnalyticsSelectorButtonClose"
            >
              {i18n.translate('xpack.ml.analyticsSelector.closeFlyoutButton', {
                defaultMessage: 'Close',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  ) : null;
}
