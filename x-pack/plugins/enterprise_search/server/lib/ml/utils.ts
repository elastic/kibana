/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { SUPPORTED_PYTORCH_TASKS } from '@kbn/ml-trained-models-utils';

import { MlModelDeploymentState, MlModel } from '../../../common/types/ml';

export const ELSER_MODEL_ID = '.elser_model_2';
export const ELSER_LINUX_OPTIMIZED_MODEL_ID = '.elser_model_2_linux-x86_64';
export const E5_MODEL_ID = '.multilingual-e5-small';
export const E5_LINUX_OPTIMIZED_MODEL_ID = '.multilingual-e5-small_linux-x86_64';
export const LANG_IDENT_MODEL_ID = 'lang_ident_model_1';

export const MODEL_TITLES_BY_TYPE: Record<string, string | undefined> = {
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
      defaultMessage: 'Question Answering',
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
    defaultMessage: 'Elastic Learned Sparse EncodeR (ELSER)',
  }),
  zero_shot_classification: i18n.translate(
    'xpack.enterpriseSearch.content.ml_inference.zero_shot_classification',
    {
      defaultMessage: 'Zero-Shot Text Classification',
    }
  ),
};

export const BASE_MODEL = {
  deploymentState: MlModelDeploymentState.NotDeployed,
  nodeAllocationCount: 0,
  startTime: 0,
  targetAllocationCount: 0,
  threadsPerAllocation: 0,
  isPlaceholder: false,
  hasStats: false,
  types: [],
  inputFieldNames: [],
};

export const ELSER_MODEL_PLACEHOLDER: MlModel = {
  ...BASE_MODEL,
  modelId: ELSER_MODEL_ID,
  type: SUPPORTED_PYTORCH_TASKS.TEXT_EXPANSION,
  title: 'ELSER (Elastic Learned Sparse EncodeR)',
  description: i18n.translate('xpack.enterpriseSearch.modelCard.elserPlaceholder.description', {
    defaultMessage:
      "ELSER is Elastic's NLP model for English semantic search, utilizing sparse vectors. It prioritizes intent and contextual meaning over literal term matching, optimized specifically for English documents and queries on the Elastic platform.",
  }),
  isPlaceholder: true,
};

export const ELSER_LINUX_OPTIMIZED_MODEL_PLACEHOLDER = {
  ...ELSER_MODEL_PLACEHOLDER,
  modelId: ELSER_LINUX_OPTIMIZED_MODEL_ID,
  title: 'ELSER (Elastic Learned Sparse EncodeR), optimized for linux-x86_64',
};

export const E5_MODEL_PLACEHOLDER: MlModel = {
  ...BASE_MODEL,
  modelId: E5_MODEL_ID,
  type: SUPPORTED_PYTORCH_TASKS.TEXT_EMBEDDING,
  title: 'E5 (EmbEddings from bidirEctional Encoder rEpresentations)',
  description: i18n.translate('xpack.enterpriseSearch.modelCard.e5Placeholder.description', {
    defaultMessage:
      'E5 is a third party NLP model that enables you to perform multi-lingual semantic search by using dense vector representations. This model performs best for non-English language documents and queries.',
  }),
  licenseType: 'mit',
  modelDetailsPageUrl: 'https://ela.st/multilingual-e5-small',
  isPlaceholder: true,
};

export const E5_LINUX_OPTIMIZED_MODEL_PLACEHOLDER = {
  ...E5_MODEL_PLACEHOLDER,
  modelId: E5_LINUX_OPTIMIZED_MODEL_ID,
  title: 'E5 (EmbEddings from bidirEctional Encoder rEpresentations), optimized for linux-x86_64',
  modelDetailsPageUrl: 'https://ela.st/multilingual-e5-small-linux-x86-64',
};
