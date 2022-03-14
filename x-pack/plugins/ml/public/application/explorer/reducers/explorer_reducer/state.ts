/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ML_RESULTS_INDEX_PATTERN } from '../../../../../common/constants/index_patterns';
import {
  getDefaultChartsData,
  ExplorerChartsData,
} from '../../explorer_charts/explorer_charts_container_service';
import { AnomaliesTableData, ExplorerJob } from '../../explorer_utils';
import { AnnotationsTable } from '../../../../../common/types/annotations';
import type { DataView } from '../../../../../../../../src/plugins/data_views/common';
import type { InfluencerValueData } from '../../../components/influencers_list/influencers_list';

export interface ExplorerState {
  overallAnnotations: AnnotationsTable;
  annotations: AnnotationsTable;
  anomalyChartsDataLoading: boolean;
  chartsData: ExplorerChartsData;
  fieldFormatsLoading: boolean;
  filterPlaceHolder: string | undefined;
  indexPattern: {
    title: string;
    fields: Array<{ name: string; type: string; aggregatable: boolean; searchable: boolean }>;
  };
  influencers: Record<string, InfluencerValueData[]>;
  isAndOperator: boolean;
  loading: boolean;
  maskAll: boolean;
  noInfluencersConfigured: boolean;
  queryString: string;
  selectedJobs: ExplorerJob[] | null;
  tableData: AnomaliesTableData;
  tableQueryString: string;
}

function getDefaultIndexPattern() {
  return { title: ML_RESULTS_INDEX_PATTERN, fields: [] } as unknown as DataView;
}

export function getExplorerDefaultState(): ExplorerState {
  return {
    overallAnnotations: {
      error: undefined,
      annotationsData: [],
    },
    annotations: {
      error: undefined,
      annotationsData: [],
    },
    anomalyChartsDataLoading: true,
    chartsData: getDefaultChartsData(),
    fieldFormatsLoading: false,
    filterPlaceHolder: undefined,
    indexPattern: getDefaultIndexPattern(),
    influencers: {},
    isAndOperator: false,
    loading: true,
    maskAll: false,
    noInfluencersConfigured: true,
    queryString: '',
    selectedJobs: null,
    tableData: {
      anomalies: [],
      examplesByJobId: [''],
      interval: 0,
      jobIds: [],
      showViewSeriesLink: false,
    },
    tableQueryString: '',
  };
}
