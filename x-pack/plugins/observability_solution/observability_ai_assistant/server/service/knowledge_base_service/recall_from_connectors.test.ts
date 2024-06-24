/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInferenceQueries } from './recall_from_connectors';

describe('getInferenceQueries', () => {
  it('', () => {
    const fieldCapsFieldNames = [
      'ml.inference.title_expanded.predicted_value',
      'title.inference.chunks.embeddings',
    ];

    const res = getInferenceQueries({
      vectorFieldNames: fieldCapsFieldNames,
      queries: [{ text: 'What is my favourite color?', boost: 2 }],
    });

    expect(res).toEqual([
      {
        bool: {
          filter: [{ term: { 'ml.inference.title_expanded.model_id': 'my-elser-model' } }],
          should: [
            {
              text_expansion: {
                'ml.inference.title_expanded.predicted_value': {
                  boost: 2,
                  model_id: 'my-elser-model',
                  model_text: 'What is my favourite color?',
                },
              },
            },
          ],
        },
      },
      {
        bool: {
          filter: [{ term: { 'title.inference.inference_id': 'my-elser-model' } }],
          should: [
            {
              text_expansion: {
                'title.inference.chunks.embeddings': {
                  boost: 2,
                  model_id: 'my-elser-model',
                  model_text: 'What is my favourite color?',
                },
              },
            },
          ],
        },
      },
    ]);
  });
});
