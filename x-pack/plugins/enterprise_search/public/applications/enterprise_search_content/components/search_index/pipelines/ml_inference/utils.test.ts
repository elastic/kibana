/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TrainedModelConfigResponse } from '@kbn/ml-plugin/common/types/trained_models';

import { isSupportedMLModel, isValidPipelineName, sortSourceFields } from './utils';

describe('ml inference utils', () => {
  describe('isSupportedMLModel', () => {
    const makeFakeModel = (
      config: Partial<TrainedModelConfigResponse>
    ): TrainedModelConfigResponse => ({
      inference_config: {},
      input: {
        field_names: [],
      },
      model_id: 'a-model-001',
      model_type: 'pytorch',
      tags: [],
      version: '1',
      ...config,
    });
    it('returns true for expected models', () => {
      const models: TrainedModelConfigResponse[] = [
        makeFakeModel({
          inference_config: {
            ner: {},
          },
        }),
        makeFakeModel({
          inference_config: {
            classification: {},
          },
        }),
        makeFakeModel({
          inference_config: {
            text_classification: {},
          },
        }),
        makeFakeModel({
          inference_config: {
            text_embedding: {},
          },
        }),
        makeFakeModel({
          inference_config: {
            zero_shot_classification: {
              classification_labels: [],
            },
          },
        }),
      ];

      for (const model of models) {
        expect(isSupportedMLModel(model)).toBe(true);
      }
    });

    it('returns false for expected models', () => {
      const models: TrainedModelConfigResponse[] = [makeFakeModel({})];

      for (const model of models) {
        expect(isSupportedMLModel(model)).toBe(false);
      }
    });
  });
  describe('sortSourceFields', () => {
    it('promotes fields', () => {
      let fields: string[] = ['id', 'body', 'url'];
      expect(fields.sort(sortSourceFields)).toEqual(['body', 'id', 'url']);
      fields = ['id', 'body_content', 'url'];
      expect(fields.sort(sortSourceFields)).toEqual(['body_content', 'id', 'url']);
      fields = ['id', 'title', 'message', 'url'];
      expect(fields.sort(sortSourceFields)).toEqual(['title', 'id', 'message', 'url']);
      fields = ['id', 'body', 'title', 'message', 'url'];
      expect(fields.sort(sortSourceFields)).toEqual(['body', 'title', 'id', 'message', 'url']);
    });
  });
  describe('isValidPipelineName', () => {
    it('allows alphanumeric characters, underscores, & hypens', () => {
      expect(isValidPipelineName('apipelinename123')).toEqual(true);
      expect(isValidPipelineName('a_pipeline_name123')).toEqual(true);
      expect(isValidPipelineName('a-pipeline-name-123')).toEqual(true);
    });
    it('does not allow spaces', () => {
      expect(isValidPipelineName('a pipeline name')).toEqual(false);
    });
    it('does not allow special characters', () => {
      expect(isValidPipelineName('a_pipeline_name_1$')).toEqual(false);
      expect(isValidPipelineName('a_pipeline_name_1%')).toEqual(false);
      expect(isValidPipelineName('a_pipeline_name_1^')).toEqual(false);
      expect(isValidPipelineName('a_pipeline_name_1"')).toEqual(false);
    });
  });
});
