/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { IngestDataCodeExamples } from '../types';
import { UPLOAD_VECTORS_TITLE } from './constants';

import { JSServerlessIngestVectorDataExample } from './javascript';
import { PythonServerlessVectorsIngestDataExample } from './python';
import { ConsoleVectorsIngestDataExample } from './sense';
import { CurlVectorsIngestDataExample } from './curl';

export const DenseVectorServerlessCodeExamples: IngestDataCodeExamples = {
  title: UPLOAD_VECTORS_TITLE,
  ingestTitle: UPLOAD_VECTORS_TITLE,
  description: i18n.translate(
    'xpack.searchIndices.codeExamples.serverless.denseVector.description',
    {
      defaultMessage:
        'The following example connects to your Elasticsearch endpoint and uploads vectors to the index.',
    }
  ),
  defaultMapping: {
    vector: { type: 'dense_vector', dims: 3 },
    text: { type: 'text' },
  },
  sense: ConsoleVectorsIngestDataExample,
  curl: CurlVectorsIngestDataExample,
  python: PythonServerlessVectorsIngestDataExample,
  javascript: JSServerlessIngestVectorDataExample,
};
