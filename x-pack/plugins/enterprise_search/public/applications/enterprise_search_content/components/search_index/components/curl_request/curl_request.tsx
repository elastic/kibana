/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCodeBlock } from '@elastic/eui';

import { IngestPipelineParams } from '../../../../../../../common/types/connectors';
import { useCloudDetails } from '../../../../../shared/cloud_details/cloud_details';

import { decodeCloudId } from '../../../../../shared/decode_cloud_id/decode_cloud_id';

interface CurlRequestParams {
  apiKey?: string;
  document?: Record<string, unknown>;
  indexName: string;
  pipeline?: IngestPipelineParams;
}

export const CurlRequest: React.FC<CurlRequestParams> = ({
  indexName,
  apiKey,
  document,
  pipeline,
}) => {
  const cloudContext = useCloudDetails();

  const DEFAULT_URL = 'https://localhost:9200';
  const baseUrl =
    (cloudContext.cloudId && decodeCloudId(cloudContext.cloudId)?.elasticsearchUrl) || DEFAULT_URL;
  const apiKeyExample = apiKey || '<Replace_with_created_API_key>';
  const { name: pipelineName, ...pipelineParams } = pipeline ?? {};
  // We have to prefix the parameters with an underscore because that's what the actual pipeline looks for
  const pipelineArgs = Object.entries(pipelineParams).reduce(
    (acc: Record<string, boolean | undefined>, curr) => ({ ...acc, [`_${curr[0]}`]: curr[1] }),
    {}
  );

  const inputDocument = pipeline ? { ...document, ...pipelineArgs } : document;

  return (
    <EuiCodeBlock language="bash" fontSize="m" isCopyable>
      {`\
curl -X POST '${baseUrl}/${indexName}/_doc${pipeline ? `?pipeline=${pipelineName}` : ''}' \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: ApiKey ${apiKeyExample}' \\
  -d '${JSON.stringify(inputDocument, null, 2)}'
`}
    </EuiCodeBlock>
  );
};
