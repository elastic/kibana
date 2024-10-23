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
import { INSTALL_INSTRUCTIONS_TITLE, INSTALL_INSTRUCTIONS_DESCRIPTION } from './constants';

export const DenseVectorServerlessCodeExamples: IngestDataCodeExamples = {
  installTitle: INSTALL_INSTRUCTIONS_TITLE,
  installDescription: INSTALL_INSTRUCTIONS_DESCRIPTION,
  addMappingsTitle: i18n.translate(
    'xpack.searchIndices.codeExamples.serverless.denseVector.mappingsTitle',
    {
      defaultMessage: 'Define field mappings',
    }
  ),
  addMappingsDescription: i18n.translate(
    'xpack.searchIndices.codeExamples.serverless.denseVector.mappingsDescription',
    {
      defaultMessage:
        'This example defines two fields: a 3-dimensional dense vector field and a text field. You can add more field types by modifying the mappings in your API call, or in the mappings tab.',
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
