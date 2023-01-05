/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { nerModel, textClassificationModel } from '../../../__mocks__/ml_models.mock';

import { TrainedModelConfigResponse } from '@kbn/ml-plugin/common/types/trained_models';

import {
  getMLType,
  getModelDisplayTitle,
  isSupportedMLModel,
  sortSourceFields,
  NLP_CONFIG_KEYS,
} from './utils';

describe('ml inference utils', () => {
  describe('isSupportedMLModel', () => {
    const makeFakeModel = (
      config: Partial<TrainedModelConfigResponse>
    ): TrainedModelConfigResponse => {
      const { inference_config: _throwAway, ...base } = nerModel;
      return {
        inference_config: {},
        ...base,
        ...config,
      };
    };
    it('returns true for expected models', () => {
      const models: TrainedModelConfigResponse[] = [
        nerModel,
        textClassificationModel,
        makeFakeModel({
          inference_config: {
            text_embedding: {},
          },
          model_id: 'mock-text_embedding',
        }),
        makeFakeModel({
          inference_config: {
            zero_shot_classification: {
              classification_labels: [],
            },
          },
          model_id: 'mock-zero_shot_classification',
        }),
        makeFakeModel({
          inference_config: {
            question_answering: {},
          },
          model_id: 'mock-question_answering',
        }),
        makeFakeModel({
          inference_config: {
            fill_mask: {},
          },
          model_id: 'mock-fill_mask',
        }),
      ];

      for (const model of models) {
        expect(isSupportedMLModel(model)).toBe(true);
      }
    });

    it('returns false for unexpected models', () => {
      const models: TrainedModelConfigResponse[] = [
        makeFakeModel({}),
        makeFakeModel({
          inference_config: {
            fakething: {},
          },
        }),
      ];

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
  describe('getMLType', () => {
    it('returns nlp type if present', () => {
      for (const nlpType of NLP_CONFIG_KEYS) {
        expect(getMLType(['pytorch', nlpType, 'foo', 'bar'])).toEqual(nlpType);
      }
    });
    it('returns first item if nlp config key not found in list', () => {
      expect(getMLType(['pytorch', 'foo'])).toEqual('pytorch');
    });
    it('returns empty string when no models given', () => {
      expect(getMLType([])).toEqual('');
    });
  });
  describe('model type titles', () => {
    test.each(NLP_CONFIG_KEYS)('%s should have a title defined', (type) =>
      expect(getModelDisplayTitle(type)).not.toBe('')
    );
    it('unsupported model type should return empty title', () => {
      // This should technically never happen given the above test.
      expect(getModelDisplayTitle('foo')).toBe(undefined);
    });
  });
});
