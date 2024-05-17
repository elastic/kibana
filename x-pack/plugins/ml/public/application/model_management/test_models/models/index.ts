/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NerInference } from './ner';
import type { QuestionAnsweringInference } from './question_answering';
import type {
  FillMaskInference,
  LangIdentInference,
  TextClassificationInference,
  ZeroShotClassificationInference,
} from './text_classification';
import type { TextEmbeddingInference } from './text_embedding';
import type { TextExpansionInference } from './text_expansion';

export type InferrerType =
  | NerInference
  | QuestionAnsweringInference
  | TextClassificationInference
  | TextEmbeddingInference
  | ZeroShotClassificationInference
  | FillMaskInference
  | LangIdentInference
  | TextExpansionInference;
