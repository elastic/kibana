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
import { FormattedMessage } from '@kbn/i18n-react';

import { BUILT_IN_MODEL_TAG } from '../../../../../../common/constants/data_frame_analytics';
import { useTrainedModelsApiService } from '../../../../services/ml_api_service/trained_models';
import { GetDataFrameAnalyticsResponse } from '../../../../services/ml_api_service/data_frame_analytics';
import { useToastNotificationService } from '../../../../services/toast_notification_service';
import { ModelsTableToConfigMapping } from '../../../../trained_models/models_management';
import { DataFrameAnalyticsConfig } from '../../../common';
import { useMlApiContext } from '../../../../contexts/kibana';
import { TrainedModelConfigResponse } from '../../../../../../common/types/trained_models';

export interface AnalyticsSelectorIds {
  model_id?: string;
  job_id?: string;
  analysis_type?: string;
}

type TableItem = DataFrameAnalyticsConfig | TrainedModelConfigResponse;

function isDataFrameAnalyticsConfigs(arg: any): arg is DataFrameAnalyticsConfig {
  return arg.dest && arg.analysis && arg.id;
}

const columns = [
  {
    field: 'id',
    name: i18n.translate('xpack.ml.analyticsSelector.id', {
      defaultMessage: 'ID',
    }),
    sortable: (item: DataFrameAnalyticsConfig) => item.id,
    truncateText: true,
    'data-test-subj': 'mlAnalyticsSelectorTableColumnId',
    scope: 'row',
  },
  {
    field: 'description',
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
    field: ModelsTableToConfigMapping.id,
    name: i18n.translate('xpack.ml.analyticsSelector.modelsList.modelIdHeader', {
      defaultMessage: 'ID',
    }),
    sortable: true,
    truncateText: false,
    'data-test-subj': 'mlAnalyticsSelectorColumnId',
  },
  {
    field: ModelsTableToConfigMapping.description,
    width: '350px',
    name: i18n.translate('xpack.ml.analyticsSelector.modelsList.modelDescriptionHeader', {
      defaultMessage: 'Description',
    }),
    sortable: false,
    truncateText: false,
    'data-test-subj': 'mlAnalyticsSelectorColumnDescription',
  },
];

interface Props {
  setAnalyticsId: React.Dispatch<React.SetStateAction<AnalyticsSelectorIds | undefined>>;
  jobsOnly?: boolean;
}

export function AnalyticsIdSelector({ setAnalyticsId, jobsOnly = false }: Props) {
  const [selected, setSelected] = useState<
    { model_id?: string; job_id?: string; analysis_type?: string } | undefined
  >();
  const [analyticsJobs, setAnalyticsJobs] = useState<DataFrameAnalyticsConfig[]>([]);
  const [trainedModels, setTrainedModels] = useState<TrainedModelConfigResponse[]>([]);
  const [isFlyoutVisible, setIsFlyoutVisible] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { displayErrorToast } = useToastNotificationService();
  const trainedModelsApiService = useTrainedModelsApiService();
  const {
    dataFrameAnalytics: { getDataFrameAnalytics },
  } = useMlApiContext();

  function renderTabs() {
    return <EuiTabbedContent size="s" tabs={tabs} initialSelectedTab={tabs[0]} />;
  }

  async function fetchAnalyticsJobs() {
    setIsLoading(true);
    try {
      const { data_frame_analytics: dataFrameAnalytics }: GetDataFrameAnalyticsResponse =
        await getDataFrameAnalytics();
      setAnalyticsJobs(dataFrameAnalytics);
    } catch (e) {
      console.error('Error fetching analytics', e); // eslint-disable-line
      displayErrorToast(
        e,
        i18n.translate('xpack.ml.analyticsSelector.analyticsFetchErrorMessage', {
          defaultMessage: 'An error occurred fetching analytics jobs. Refresh and try again.',
        })
      );
    }
    setIsLoading(false);
  }

  async function fetchAnalyticsModels() {
    setIsLoading(true);
    try {
      const response = await trainedModelsApiService.getTrainedModels();
      setTrainedModels(response);
    } catch (e) {
      console.error('Error fetching trained models', e); // eslint-disable-line
      displayErrorToast(
        e,
        i18n.translate('xpack.ml.analyticsSelector.trainedModelsFetchErrorMessage', {
          defaultMessage: 'An error occurred fetching trained models. Refresh and try again.',
        })
      );
    }
    setIsLoading(false);
  }

  function closeFlyout() {
    setIsFlyoutVisible(false);
  }

  // Fetch analytics jobs and models on flyout open
  useEffect(() => {
    fetchAnalyticsJobs();
    if (jobsOnly === false) {
      fetchAnalyticsModels();
    }
  }, []);

  const applySelection = useCallback(() => {
    if (selected !== undefined) {
      setAnalyticsId(selected);
    }
    closeFlyout();
  }, [selected?.model_id, selected?.job_id]);

  const pagination = {
    initialPageSize: 5,
    pageSizeOptions: [3, 5, 8],
  };

  const selectionValue = {
    selectable: (item: TableItem) => {
      const selectedId = selected?.job_id ?? selected?.model_id;
      const isDFA = isDataFrameAnalyticsConfigs(item);
      const itemId = isDFA ? item.id : item.model_id;
      const isBuiltInModel = isDFA ? false : item.tags.includes(BUILT_IN_MODEL_TAG);
      return (selected === undefined || selectedId === itemId) && !isBuiltInModel;
    },
    onSelectionChange: (selectedItem: TableItem[]) => {
      const item = selectedItem[0];
      if (!item) {
        setSelected(undefined);
        return;
      }
      const isDFA = isDataFrameAnalyticsConfigs(item);
      const config = isDFA ? item.analysis : item.inference_config;
      const analysisType = config ? Object.keys(config)[0] : undefined;

      setSelected({
        model_id: isDFA ? undefined : item.model_id,
        job_id: isDFA ? item.id : undefined,
        analysis_type: analysisType,
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
  ];

  if (jobsOnly === false) {
    tabs.push({
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
    });
  }

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
      <EuiFlyoutBody data-test-subj={'mlJobSelectorFlyoutBody'}>{renderTabs()}</EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={applySelection}
              fill
              isDisabled={selected === undefined}
              data-test-subj="mlFlyoutAnalyticsSelectorButtonApply"
            >
              <FormattedMessage
                id="xpack.ml.analyticsSelector.applyFlyoutButton"
                defaultMessage="Apply"
              />
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
