/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INDEX_PLACEHOLDER } from '../constants';
import { CreateIndexLanguageExamples } from '../types';

export const ConsoleExamples: CreateIndexLanguageExamples = {
  default: {
    createIndex: ({ indexName }) => `PUT /${indexName ?? INDEX_PLACEHOLDER}`,
  },
  dense_vector: {
    createIndex: ({ indexName }) => `PUT /${indexName ?? INDEX_PLACEHOLDER}
{
  "mappings": {
    "properties":{
      "vector":{
        "type": "dense_vector",
        "dims": 3
      },
      "text":{
        "type":"text"
      }
    }
  }
}`,
  },
};
