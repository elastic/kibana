/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NerInference } from './ner';
import {
  TextClassificationInference,
  ZeroShotClassificationInference,
  FillMaskInference,
} from './text_classification';
import { TextEmbeddingInference } from './text_embedding';
import { LangIdentInference } from './lang_ident';

export type InferrerType =
  | NerInference
  | TextClassificationInference
  | TextEmbeddingInference
  | ZeroShotClassificationInference
  | FillMaskInference
  | LangIdentInference;
