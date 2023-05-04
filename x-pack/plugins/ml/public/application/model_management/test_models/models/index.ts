/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NerInference } from './ner';
import { QuestionAnsweringInference } from './question_answering';
import {
  TextClassificationInference,
  ZeroShotClassificationInference,
  FillMaskInference,
  LangIdentInference,
} from './text_classification';
import { TextEmbeddingInference } from './text_embedding';

export type InferrerType =
  | NerInference
  | QuestionAnsweringInference
  | TextClassificationInference
  | TextEmbeddingInference
  | ZeroShotClassificationInference
  | FillMaskInference
  | LangIdentInference;
