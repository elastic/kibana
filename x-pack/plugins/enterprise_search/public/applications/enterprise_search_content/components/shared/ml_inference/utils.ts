/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { TrainedModelConfigResponse } from '@kbn/ml-plugin/common/types/trained_models';

import { TRAINED_MODEL_TYPE, SUPPORTED_PYTORCH_TASKS } from '@kbn/ml-trained-models-utils';

import { TrainedModel } from '../../../api/ml_models/ml_trained_models_logic';

export const NLP_CONFIG_KEYS: string[] = Object.values(SUPPORTED_PYTORCH_TASKS);
export const RECOMMENDED_FIELDS = ['body', 'body_content', 'title'];

export const NLP_DISPLAY_TITLES: Record<string, string | undefined> = {
  fill_mask: i18n.translate('xpack.enterpriseSearch.content.ml_inference.fill_mask', {
    defaultMessage: 'Fill Mask',
  }),
  lang_ident: i18n.translate('xpack.enterpriseSearch.content.ml_inference.lang_ident', {
    defaultMessage: 'Language Identification',
  }),
  ner: i18n.translate('xpack.enterpriseSearch.content.ml_inference.ner', {
    defaultMessage: 'Named Entity Recognition',
  }),
  question_answering: i18n.translate(
    'xpack.enterpriseSearch.content.ml_inference.question_answering',
    {
      defaultMessage: 'Named Entity Recognition',
    }
  ),
  text_classification: i18n.translate(
    'xpack.enterpriseSearch.content.ml_inference.text_classification',
    {
      defaultMessage: 'Text Classification',
    }
  ),
  text_embedding: i18n.translate('xpack.enterpriseSearch.content.ml_inference.text_embedding', {
    defaultMessage: 'Dense Vector Text Embedding',
  }),
  text_expansion: i18n.translate('xpack.enterpriseSearch.content.ml_inference.text_expansion', {
    defaultMessage: 'ELSER Text Expansion',
  }),
  zero_shot_classification: i18n.translate(
    'xpack.enterpriseSearch.content.ml_inference.zero_shot_classification',
    {
      defaultMessage: 'Zero-Shot Text Classification',
    }
  ),
};

export const isSupportedMLModel = (model: TrainedModelConfigResponse): boolean => {
  return (
    Object.keys(model.inference_config || {}).some((key) => NLP_CONFIG_KEYS.includes(key)) ||
    model.model_type === TRAINED_MODEL_TYPE.LANG_IDENT
  );
};

export const sortSourceFields = (a: string, b: string): number => {
  const promoteA = RECOMMENDED_FIELDS.includes(a);
  const promoteB = RECOMMENDED_FIELDS.includes(b);
  if (promoteA && promoteB) {
    return RECOMMENDED_FIELDS.indexOf(a) > RECOMMENDED_FIELDS.indexOf(b) ? 1 : -1;
  } else if (promoteA) {
    return -1;
  } else if (promoteB) {
    return 1;
  }
  return a.localeCompare(b);
};

export const getMLType = (modelTypes: string[]): string => {
  for (const type of modelTypes) {
    if (NLP_CONFIG_KEYS.includes(type)) {
      return type;
    }
  }
  if (modelTypes?.includes(TRAINED_MODEL_TYPE.LANG_IDENT)) return TRAINED_MODEL_TYPE.LANG_IDENT;
  return modelTypes?.[0] ?? '';
};

export const getModelDisplayTitle = (type: string): string | undefined => NLP_DISPLAY_TITLES[type];

export const isTextExpansionModel = (model: TrainedModel): boolean =>
  Boolean(model.inference_config?.text_expansion);

/**
 * Sort function for displaying a list of models. Promotes text_expansion models and sorts the rest by model ID.
 */
export const sortModels = (m1: TrainedModel, m2: TrainedModel) =>
  isTextExpansionModel(m1)
    ? -1
    : isTextExpansionModel(m2)
    ? 1
    : m1.model_id.localeCompare(m2.model_id);
