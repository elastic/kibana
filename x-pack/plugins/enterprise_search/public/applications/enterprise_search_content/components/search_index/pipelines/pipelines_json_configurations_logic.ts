/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { IngestPipeline } from '@elastic/elasticsearch/lib/api/types';

import { Actions } from '../../../../shared/api_logic/create_api_logic';
import {
  FetchCustomPipelineApiLogicArgs,
  FetchCustomPipelineApiLogicResponse,
  FetchCustomPipelineApiLogic,
} from '../../../api/index/fetch_custom_pipeline_api_logic';
import { IndexNameLogic } from '../index_name_logic';

interface IndexPipelinesConfigurationsActions {
  fetchIndexPipelinesDataSuccess: Actions<
    FetchCustomPipelineApiLogicArgs,
    FetchCustomPipelineApiLogicResponse
  >['apiSuccess'];
  selectPipeline: (pipeline: string) => { pipeline: string };
}

export interface IndexPipelinesConfigurationsValues {
  indexName: string;
  indexPipelinesData: FetchCustomPipelineApiLogicResponse | undefined;
  pipelineNames: string[];
  pipelines: Record<string, IngestPipeline>;
  selectedPipeline: IngestPipeline | undefined;
  selectedPipelineId: string;
  selectedPipelineJSON: string;
}

export const IndexPipelinesConfigurationsLogic = kea<
  MakeLogicType<IndexPipelinesConfigurationsValues, IndexPipelinesConfigurationsActions>
>({
  actions: {
    selectPipeline: (pipeline: string) => ({ pipeline }),
  },
  connect: {
    actions: [FetchCustomPipelineApiLogic, ['apiSuccess as fetchIndexPipelinesDataSuccess']],
    values: [
      IndexNameLogic,
      ['indexName'],
      FetchCustomPipelineApiLogic,
      ['data as indexPipelinesData'],
    ],
  },
  events: ({ actions, values }) => ({
    afterMount: () => {
      // @ts-expect-error upgrade typescript v4.9.5
      if (!values.indexPipelinesData || values.indexPipelinesData.length === 0) {
        return;
      }
      const pipelineNames = Object.keys(values.indexPipelinesData).sort();
      const defaultPipeline = pipelineNames.includes(values.indexName)
        ? values.indexName
        : pipelineNames[0];
      actions.selectPipeline(defaultPipeline);
    },
  }),
  listeners: ({ actions, values }) => ({
    fetchIndexPipelinesDataSuccess: (pipelines) => {
      const names = Object.keys(pipelines ?? {}).sort();
      if (names.length > 0 && values.selectedPipelineId.length === 0) {
        const defaultPipeline = names.includes(values.indexName) ? values.indexName : names[0];
        actions.selectPipeline(defaultPipeline);
      }
    },
  }),
  path: ['enterprise_search', 'content', 'pipelines_json_configurations'],
  reducers: () => ({
    selectedPipelineId: [
      '',
      {
        // @ts-expect-error upgrade typescript v5.1.6
        selectPipeline: (_, { pipeline }) => pipeline,
      },
    ],
  }),
  selectors: ({ selectors }) => ({
    pipelines: [
      () => [selectors.indexPipelinesData],
      (indexPipelines: FetchCustomPipelineApiLogicResponse) => {
        return indexPipelines ?? {};
      },
    ],
    pipelineNames: [
      () => [selectors.pipelines],
      (pipelines: Record<string, IngestPipeline>) => {
        return Object.keys(pipelines).sort();
      },
    ],
    selectedPipeline: [
      () => [selectors.selectedPipelineId, selectors.pipelines],
      (selectedPipelineId: string, pipelines: Record<string, IngestPipeline>) => {
        if (pipelines.hasOwnProperty(selectedPipelineId)) {
          return pipelines[selectedPipelineId];
        }
        return undefined;
      },
    ],
    selectedPipelineJSON: [
      () => [selectors.selectedPipeline],
      (selectedPipeline: IngestPipeline | undefined) => {
        if (selectedPipeline) {
          return JSON.stringify(selectedPipeline, null, 2);
        }
        return '';
      },
    ],
  }),
});
