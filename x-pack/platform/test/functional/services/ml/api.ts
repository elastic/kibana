/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SUPPORTED_TRAINED_MODELS = {
  TINY_FILL_MASK: {
    name: 'pt_tiny_fill_mask',
    description: 'Tiny/Dummy PyTorch model (fill_mask)',
    modelTypes: ['pytorch', 'fill_mask'],
  },
  TINY_NER: {
    name: 'pt_tiny_ner',
    description: 'Tiny/Dummy PyTorch model (ner)',
    modelTypes: ['pytorch', 'ner'],
  },
  TINY_PASS_THROUGH: {
    name: 'pt_tiny_pass_through',
    description: 'Tiny/Dummy PyTorch model (pass_through)',
    modelTypes: ['pytorch', 'pass_through'],
  },
  TINY_TEXT_CLASSIFICATION: {
    name: 'pt_tiny_text_classification',
    description: 'Tiny/Dummy PyTorch model (text_classification)',
    modelTypes: ['pytorch', 'text_classification'],
  },
  TINY_TEXT_EMBEDDING: {
    name: 'pt_tiny_text_embedding',
    description: 'Tiny/Dummy PyTorch model (text_embedding)',
    modelTypes: ['pytorch', 'text_embedding'],
  },
  TINY_ZERO_SHOT: {
    name: 'pt_tiny_zero_shot',
    description: 'Tiny/Dummy PyTorch model (zero_shot)',
    modelTypes: ['pytorch', 'zero_shot'],
  },
  TINY_ELSER: {
    name: 'pt_tiny_elser',
    description: 'Tiny ELSER model',
    modelTypes: ['pytorch'],
  },
} as const;
