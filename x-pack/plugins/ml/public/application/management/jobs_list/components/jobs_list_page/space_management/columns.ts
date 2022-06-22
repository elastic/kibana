/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { MlSavedObjectType } from '../../../../../../../common/types/saved_objects';

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

const adColumns = [
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

// const filters: EuiSearchBarProps['filters'] = [
//   {
//     type: 'field_value_selection',
//     field: 'job_type',
//     name: i18n.translate('xpack.ml.dataframe.analyticsList.typeFilter', {
//       defaultMessage: 'Type',
//     }),
//     multiSelect: 'or',
//     options: Object.values(ANALYSIS_CONFIG_TYPE).map((val) => ({
//       value: val,
//       name: val,
//       view: getJobTypeBadge(val),
//     })),
//   },
//   {
//     type: 'field_value_selection',
//     field: 'state',
//     name: i18n.translate('xpack.ml.dataframe.analyticsList.statusFilter', {
//       defaultMessage: 'Status',
//     }),
//     multiSelect: 'or',
//     options: Object.values(DATA_FRAME_TASK_STATE).map((val) => ({
//       value: val,
//       name: val,
//       view: getTaskStateBadge(val),
//     })),
//   },
// ];

const dfaColumns = [
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
    field: 'type',
    name: i18n.translate('xpack.ml.analyticsSelector.sourceIndex', {
      defaultMessage: 'Type',
    }),
    sortable: true,
    truncateText: true,
    'data-test-subj': 'mlAnalyticsSelectorColumnSourceIndex',
  },
  {
    field: 'status',
    name: i18n.translate('xpack.ml.analyticsSelector.sourceIndex', {
      defaultMessage: 'Status',
    }),
    sortable: true,
    truncateText: true,
    'data-test-subj': 'mlAnalyticsSelectorColumnSourceIndex',
  },
];

const trainedModelColumns = [
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
