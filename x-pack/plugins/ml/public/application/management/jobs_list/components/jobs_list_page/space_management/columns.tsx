/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBasicTableColumn } from '@elastic/eui';
import type { MlSavedObjectType } from '../../../../../../../common/types/saved_objects';
import type {
  AnalyticsManagementItems,
  AnomalyDetectionManagementItems,
  TrainedModelsManagementItems,
} from '../../../../../../../common/types/management';
import { AnomalyDetectionJobIdLink } from '../../../../../jobs/jobs_list/components/jobs_list/job_id_link';
import { DFAnalyticsJobIdLink } from '../../../../../data_frame_analytics/pages/analytics_management/components/analytics_list/use_columns';

export function getColumns(mlSavedObjectType: MlSavedObjectType) {
  switch (mlSavedObjectType) {
    case 'anomaly-detector':
      return adColumns;
    case 'data-frame-analytics':
      return dfaColumns;
    case 'trained-model':
      return trainedModelColumns;

    default:
      return [];
  }
}

const adColumns: Array<EuiBasicTableColumn<AnomalyDetectionManagementItems>> = [
  {
    field: 'id',
    name: i18n.translate('xpack.ml.analyticsSelector.id', {
      defaultMessage: 'ID',
    }),
    sortable: true,
    truncateText: true,
    'data-test-subj': 'mlAnalyticsSelectorTableColumnId',
    scope: 'row',
    render: (id: string) => <AnomalyDetectionJobIdLink id={id} />,
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
    field: 'jobState',
    name: i18n.translate('xpack.ml.analyticsSelector.sourceIndex', {
      defaultMessage: 'Job state',
    }),
    sortable: true,
    truncateText: true,
    'data-test-subj': 'mlAnalyticsSelectorColumnSourceIndex',
  },
  {
    field: 'datafeedState',
    name: i18n.translate('xpack.ml.analyticsSelector.sourceIndex', {
      defaultMessage: 'Datafeed state',
    }),
    sortable: true,
    truncateText: true,
    'data-test-subj': 'mlAnalyticsSelectorColumnSourceIndex',
  },
];

const dfaColumns: Array<EuiBasicTableColumn<AnalyticsManagementItems>> = [
  {
    field: 'id',
    name: i18n.translate('xpack.ml.analyticsSelector.id', {
      defaultMessage: 'ID',
    }),
    sortable: true,
    truncateText: true,
    'data-test-subj': 'mlAnalyticsSelectorTableColumnId',
    scope: 'row',
    render: (id: string) => <DFAnalyticsJobIdLink jobId={id} />,
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
    field: 'source_index',
    name: i18n.translate('xpack.ml.analyticsSelector.sourceIndex', {
      defaultMessage: 'Source index',
    }),
    sortable: true,
    truncateText: true,
    'data-test-subj': 'mlAnalyticsSelectorColumnSourceIndex',
  },
  {
    field: 'dest_index',
    name: i18n.translate('xpack.ml.analyticsSelector.sourceIndex', {
      defaultMessage: 'Destination index',
    }),
    sortable: true,
    truncateText: true,
    'data-test-subj': 'mlAnalyticsSelectorColumnSourceIndex',
  },
  {
    field: 'job_type',
    name: i18n.translate('xpack.ml.analyticsSelector.sourceIndex', {
      defaultMessage: 'Type',
    }),
    sortable: true,
    truncateText: true,
    'data-test-subj': 'mlAnalyticsSelectorColumnSourceIndex',
  },
  {
    field: 'state',
    name: i18n.translate('xpack.ml.analyticsSelector.sourceIndex', {
      defaultMessage: 'Status',
    }),
    sortable: true,
    truncateText: true,
    'data-test-subj': 'mlAnalyticsSelectorColumnSourceIndex',
  },
];

const trainedModelColumns: Array<EuiBasicTableColumn<TrainedModelsManagementItems>> = [
  {
    field: 'id',
    name: i18n.translate('xpack.ml.analyticsSelector.id', {
      defaultMessage: 'ID',
    }),
    sortable: true,
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
    field: 'type',
    name: i18n.translate('xpack.ml.analyticsSelector.sourceIndex', {
      defaultMessage: 'Type',
    }),
    sortable: true,
    truncateText: true,
    'data-test-subj': 'mlAnalyticsSelectorColumnSourceIndex',
  },
  {
    field: 'state',
    name: i18n.translate('xpack.ml.analyticsSelector.sourceIndex', {
      defaultMessage: 'State',
    }),
    sortable: true,
    truncateText: true,
    'data-test-subj': 'mlAnalyticsSelectorColumnSourceIndex',
  },
];
