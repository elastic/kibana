/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockFlashMessageHelpers } from '../../../../__mocks__/kea_logic';
import { apiIndex, connectorIndex } from '../../../__mocks__/view_index.mock';

import type { IngestPipeline } from '@elastic/elasticsearch/lib/api/types';

import { nextTick } from '@kbn/test-jest-helpers';

import { UpdatePipelineApiLogic } from '../../../api/connector/update_pipeline_api_logic';
import { CachedFetchIndexApiLogic } from '../../../api/index/cached_fetch_index_api_logic';
import { FetchCustomPipelineApiLogic } from '../../../api/index/fetch_custom_pipeline_api_logic';
import { DetachMlInferencePipelineApiLogic } from '../../../api/pipelines/detach_ml_inference_pipeline';

import { PipelinesLogic } from './pipelines_logic';

const DEFAULT_PIPELINE_VALUES = {
  extract_binary_content: true,
  name: 'ent-search-generic-ingestion',
  reduce_whitespace: true,
  run_ml_inference: true,
};

const DEFAULT_VALUES = {
  canSetPipeline: true,
  canUseMlInferencePipeline: false,
  customPipelineData: undefined,
  defaultPipelineValues: DEFAULT_PIPELINE_VALUES,
  defaultPipelineValuesData: undefined,
  hasIndexIngestionPipeline: false,
  index: undefined,
  indexName: '',
  isDeleteModalOpen: false,
  mlInferencePipelineProcessors: undefined,
  pipelineName: DEFAULT_PIPELINE_VALUES.name,
  pipelineState: DEFAULT_PIPELINE_VALUES,
  showAddMlInferencePipelineModal: false,
  showMissingPipelineCallout: false,
  showPipelineSettings: false,
};

describe('PipelinesLogic', () => {
  const { mount } = new LogicMounter(PipelinesLogic);
  const { mount: mountFetchIndexApiWrapperLogic } = new LogicMounter(CachedFetchIndexApiLogic);
  const { mount: mountUpdatePipelineLogic } = new LogicMounter(UpdatePipelineApiLogic);
  const { mount: mountFetchCustomPipelineApiLogic } = new LogicMounter(FetchCustomPipelineApiLogic);
  const { mount: mountDetachMlInferencePipelineApiLogic } = new LogicMounter(
    DetachMlInferencePipelineApiLogic
  );
  const { clearFlashMessages, flashAPIErrors, flashSuccessToast } = mockFlashMessageHelpers;

  const newPipeline = {
    ...DEFAULT_PIPELINE_VALUES,
    name: 'new_pipeline_name',
    run_ml_inference: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mountFetchIndexApiWrapperLogic();
    mountDetachMlInferencePipelineApiLogic();
    mountFetchCustomPipelineApiLogic();
    mountUpdatePipelineLogic();
    mount();
  });

  it('has expected default values', () => {
    expect(PipelinesLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    it('should set showPipelineSettings to false and call fetchApiSuccess', async () => {
      CachedFetchIndexApiLogic.actions.apiSuccess(connectorIndex);
      PipelinesLogic.actions.fetchIndexApiSuccess = jest.fn();
      PipelinesLogic.actions.setPipelineState(newPipeline);
      PipelinesLogic.actions.openPipelineSettings();
      PipelinesLogic.actions.apiSuccess({ connectorId: 'a', pipeline: newPipeline });
      expect(PipelinesLogic.values).toEqual({
        ...DEFAULT_VALUES,
        index: {
          ...connectorIndex,
          connector: { ...connectorIndex.connector },
        },
        indexName: 'connector',
      });
      expect(flashSuccessToast).toHaveBeenCalled();
      expect(PipelinesLogic.actions.fetchIndexApiSuccess).toHaveBeenCalledWith({
        ...connectorIndex,
        connector: {
          ...connectorIndex.connector,
          pipeline: newPipeline,
        },
      });
    });
    it('should set pipelineState on setPipeline', () => {
      PipelinesLogic.actions.setPipelineState({
        ...DEFAULT_PIPELINE_VALUES,
        name: 'new_pipeline_name',
      });
      expect(PipelinesLogic.values).toEqual({
        ...DEFAULT_VALUES,
        canUseMlInferencePipeline: true,
        hasIndexIngestionPipeline: true,
        pipelineName: 'new_pipeline_name',
        pipelineState: { ...DEFAULT_PIPELINE_VALUES, name: 'new_pipeline_name' },
      });
    });
    describe('makeRequest', () => {
      it('should call clearFlashMessages', () => {
        PipelinesLogic.actions.makeRequest({ connectorId: 'a', pipeline: DEFAULT_PIPELINE_VALUES });
        expect(clearFlashMessages).toHaveBeenCalled();
      });
    });
    describe('openPipelineSettings', () => {
      it('should set showPipelineSettings to true', () => {
        PipelinesLogic.actions.openPipelineSettings();
        expect(PipelinesLogic.values).toEqual({ ...DEFAULT_VALUES, showPipelineSettings: true });
      });
    });
    describe('closePipelineSettings', () => {
      it('should set showPipelineSettings to false', () => {
        PipelinesLogic.actions.openPipelineSettings();
        PipelinesLogic.actions.closePipelineSettings();
        expect(PipelinesLogic.values).toEqual({ ...DEFAULT_VALUES, showPipelineSettings: false });
      });
    });
    describe('apiError', () => {
      it('should call flashAPIError', () => {
        PipelinesLogic.actions.apiError('error' as any);
        expect(flashAPIErrors).toHaveBeenCalledWith('error');
      });
    });
    describe('apiSuccess', () => {
      it('should call flashSuccessToast', () => {
        PipelinesLogic.actions.apiSuccess({ connectorId: 'a', pipeline: newPipeline });
        expect(flashSuccessToast).toHaveBeenCalledWith('Pipelines updated');
      });
    });
    describe('createCustomPipelineError', () => {
      it('should call flashAPIError', () => {
        PipelinesLogic.actions.createCustomPipelineError('error' as any);
        expect(flashAPIErrors).toHaveBeenCalledWith('error');
      });
    });
    describe('createCustomPipelineSuccess', () => {
      it('should call flashSuccessToast and update pipelines', () => {
        PipelinesLogic.actions.setPipelineState = jest.fn();
        PipelinesLogic.actions.savePipeline = jest.fn();
        PipelinesLogic.actions.fetchCustomPipeline = jest.fn();
        PipelinesLogic.actions.fetchIndexApiSuccess(connectorIndex);
        // @ts-expect-error pipeline._meta defined as mandatory
        PipelinesLogic.actions.createCustomPipelineSuccess({ [connectorIndex.name]: {} });
        expect(flashSuccessToast).toHaveBeenCalledWith('Custom pipeline created');
        expect(PipelinesLogic.actions.setPipelineState).toHaveBeenCalledWith({
          ...PipelinesLogic.values.pipelineState,
          name: connectorIndex.name,
        });
        expect(PipelinesLogic.actions.savePipeline).toHaveBeenCalled();
        expect(PipelinesLogic.actions.fetchCustomPipeline).toHaveBeenCalled();
      });
    });
    describe('fetchIndexApiSuccess', () => {
      it('should set pipelineState if not editing', () => {
        PipelinesLogic.actions.fetchIndexApiSuccess({
          ...connectorIndex,
          connector: { ...connectorIndex.connector, pipeline: newPipeline },
        });
        expect(PipelinesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          canUseMlInferencePipeline: true,
          hasIndexIngestionPipeline: true,
          index: {
            ...connectorIndex,
            connector: { ...connectorIndex.connector, pipeline: newPipeline },
          },
          indexName: 'connector',
          pipelineName: 'new_pipeline_name',
          pipelineState: newPipeline,
        });
      });
      it('should not set configState if modal is open', () => {
        PipelinesLogic.actions.openPipelineSettings();
        PipelinesLogic.actions.fetchIndexApiSuccess({
          ...connectorIndex,
          connector: { ...connectorIndex.connector, pipeline: newPipeline },
        });
        expect(PipelinesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          index: {
            ...connectorIndex,
            connector: { ...connectorIndex.connector, pipeline: newPipeline },
          },
          indexName: 'connector',
          showPipelineSettings: true,
        });
      });
    });
    describe('savePipeline', () => {
      it('should call makeRequest', () => {
        PipelinesLogic.actions.makeRequest = jest.fn();
        PipelinesLogic.actions.fetchIndexApiSuccess(connectorIndex);
        PipelinesLogic.actions.savePipeline();
        expect(PipelinesLogic.actions.makeRequest).toHaveBeenCalledWith({
          connectorId: '2',
          pipeline: DEFAULT_PIPELINE_VALUES,
        });
      });
    });
    describe('fetchCustomPipelineSuccess', () => {
      it('should support api indices with custom ingest pipelines', () => {
        PipelinesLogic.actions.fetchIndexApiSuccess({
          ...apiIndex,
        });
        const indexName = apiIndex.name;
        // @ts-expect-error pipeline._meta defined as mandatory
        const indexPipelines: Record<string, IngestPipeline> = {
          [indexName]: {
            processors: [],
            version: 1,
          },
          [`${indexName}@custom`]: {
            processors: [],
            version: 1,
          },
          [`${indexName}@ml-inference`]: {
            processors: [],
            version: 1,
          },
        };
        PipelinesLogic.actions.fetchCustomPipelineSuccess(indexPipelines);

        expect(PipelinesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          canSetPipeline: false,
          canUseMlInferencePipeline: true,
          customPipelineData: indexPipelines,
          hasIndexIngestionPipeline: true,
          index: {
            ...apiIndex,
          },
          indexName,
          pipelineName: indexName,
        });
      });
    });
    describe('detachMlPipelineSuccess', () => {
      it('re-fetches pipeline data', async () => {
        jest.spyOn(PipelinesLogic.actions, 'fetchMlInferenceProcessors');
        jest.spyOn(PipelinesLogic.actions, 'fetchCustomPipeline');
        CachedFetchIndexApiLogic.actions.apiSuccess(connectorIndex);
        DetachMlInferencePipelineApiLogic.actions.apiSuccess({
          updated: 'mock-pipeline-name',
        });
        await nextTick();
        expect(PipelinesLogic.actions.fetchMlInferenceProcessors).toHaveBeenCalledWith({
          indexName: connectorIndex.name,
        });
        expect(PipelinesLogic.actions.fetchCustomPipeline).toHaveBeenCalledWith({
          indexName: connectorIndex.name,
        });
      });
    });
    describe('detachMlPipelineError', () => {
      it('calls flashAPIErrors', () => {
        DetachMlInferencePipelineApiLogic.actions.apiError('error' as any);
        expect(flashAPIErrors).toHaveBeenCalledTimes(1);
        expect(flashAPIErrors).toHaveBeenCalledWith('error');
      });
    });
  });
});
