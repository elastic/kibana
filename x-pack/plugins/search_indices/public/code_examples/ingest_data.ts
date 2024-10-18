/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { IngestDataCodeExamples } from '../types';

import { JSServerlessIngestVectorDataExample } from './javascript';
import { PythonServerlessVectorsIngestDataExample } from './python';
import { ConsoleVectorsIngestDataExample } from './sense';
import { CurlVectorsIngestDataExample } from './curl';

export const DenseVectorServerlessCodeExamples: IngestDataCodeExamples = {
  addMappingsTitle: i18n.translate(
    'xpack.searchIndices.codeExamples.serverless.denseVector.mappingsTitle',
    {
      defaultMessage: 'Apply Field Mappings',
    }
  ),
  addMappingsDescription: i18n.translate(
    'xpack.searchIndices.codeExamples.serverless.denseVector.mappingsDescription',
    {
      defaultMessage:
        'The following example defines two fields: a 3 dimensional dense vector field and a single text field. You can define more types of fields to your index by modifying the mappings. You can also define the field mappings in the mappings tab.',
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
