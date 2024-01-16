/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

/** Validates Output Index starts with `.kibana-elastic-ai-assistant-` */
const outputIndex = new t.Type<string, string, unknown>(
  'OutputIndexPrefixed',
  (input): input is string =>
    typeof input === 'string' && input.startsWith('.kibana-elastic-ai-assistant-'),
  (input, context) =>
    typeof input === 'string' && input.startsWith('.kibana-elastic-ai-assistant-')
      ? t.success(input)
      : t.failure(
          input,
          context,
          `Type error: Output Index does not start with '.kibana-elastic-ai-assistant-'`
        ),
  t.identity
);

/** Validates the URL path of a POST request to the `/evaluate` endpoint */
export const PostEvaluatePathQuery = t.type({
  agents: t.string,
  datasetName: t.union([t.string, t.undefined]),
  evaluationType: t.union([t.string, t.undefined]),
  evalModel: t.union([t.string, t.undefined]),
  models: t.string,
  outputIndex,
  projectName: t.union([t.string, t.undefined]),
  runName: t.union([t.string, t.undefined]),
});

export type PostEvaluatePathQueryInputs = t.TypeOf<typeof PostEvaluatePathQuery>;

export type DatasetItem = t.TypeOf<typeof DatasetItem>;
export const DatasetItem = t.type({
  id: t.union([t.string, t.undefined]),
  input: t.string,
  reference: t.string,
  tags: t.union([t.array(t.string), t.undefined]),
  prediction: t.union([t.string, t.undefined]),
});

export type Dataset = t.TypeOf<typeof Dataset>;
export const Dataset = t.array(DatasetItem);

/** Validates the body of a POST request to the `/evaluate` endpoint */
export const PostEvaluateBody = t.type({
  dataset: t.union([Dataset, t.undefined]),
  evalPrompt: t.union([t.string, t.undefined]),
});

export type PostEvaluateBodyInputs = t.TypeOf<typeof PostEvaluateBody>;
