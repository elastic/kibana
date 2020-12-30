/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Pipeline } from '../../../../../common/types';
import { VerboseTestOutput, Document } from '../types';

export const PROCESSORS: Pick<Pipeline, 'processors'> = {
  processors: [
    {
      set: {
        field: 'field1',
        value: 'value1',
      },
    },
  ],
};

export const DOCUMENTS: Document[] = [
  {
    _index: 'index',
    _id: 'id1',
    _source: {
      name: 'foo',
    },
  },
  {
    _index: 'index',
    _id: 'id2',
    _source: {
      name: 'bar',
    },
  },
];

export const SIMULATE_RESPONSE: VerboseTestOutput = {
  docs: [
    {
      processor_results: [
        {
          processor_type: 'set',
          status: 'success',
          tag: 'some_tag',
          doc: {
            _index: 'index',
            _id: 'id1',
            _source: {
              name: 'foo',
              foo: 'bar',
            },
          },
        },
      ],
    },
    {
      processor_results: [
        {
          processor_type: 'set',
          status: 'success',
          tag: 'some_tag',
          doc: {
            _index: 'index',
            _id: 'id2',
            _source: {
              name: 'bar',
              foo: 'bar',
            },
          },
        },
      ],
    },
  ],
};
