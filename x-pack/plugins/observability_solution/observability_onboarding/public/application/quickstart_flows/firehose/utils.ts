/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const HAS_DATA_FETCH_INTERVAL = 5000;

export function buildCreateStackCommand({
  templateUrl,
  stackName,
  logsStreamName,
  metricsStreamName,
  encodedApiKey,
  elasticsearchUrl,
}: {
  templateUrl: string;
  stackName: string;
  logsStreamName: string;
  metricsStreamName: string;
  encodedApiKey: string;
  elasticsearchUrl: string;
}) {
  const escapedElasticsearchUrl = elasticsearchUrl.replace(/\//g, '\\/');
  const escapedTemplateUrl = templateUrl.replace(/\//g, '\\/');

  return `
    aws cloudformation create-stack
      --stack-name ${stackName}
      --template-url ${escapedTemplateUrl}
      --parameters ParameterKey=FirehoseStreamNameForLogs,ParameterValue=${logsStreamName}
                   ParameterKey=FirehoseStreamNameForMetrics,ParameterValue=${metricsStreamName}
                   ParameterKey=ElasticEndpointURL,ParameterValue=${escapedElasticsearchUrl}
                   ParameterKey=ElasticAPIKey,ParameterValue=${encodedApiKey}
      --capabilities CAPABILITY_IAM
  `
    .trim()
    .replace(/\n/g, ' ')
    .replace(/\s\s+/g, ' ');
}

export function buildStackStatusCommand({ stackName }: { stackName: string }) {
  return `
    aws cloudformation describe-stacks
      --stack-name ${stackName}
      --query "Stacks[0].StackStatus"
  `
    .trim()
    .replace(/\n/g, ' ')
    .replace(/\s\s+/g, ' ');
}

export function buildCreateStackAWSConsoleURL({
  templateUrl,
  stackName,
  logsStreamName,
  metricsStreamName,
  elasticsearchUrl,
  encodedApiKey,
}: {
  templateUrl: string;
  stackName: string;
  logsStreamName: string;
  metricsStreamName: string;
  elasticsearchUrl: string;
  encodedApiKey: string;
}): string {
  const url = new URL('https://console.aws.amazon.com');
  const params = new URLSearchParams({
    templateURL: templateUrl,
    stackName,
    /**
     * 'param_' format is enforced by AWS
     * but template parameters are in CamelCase
     * which triggers the eslint rule.
     */
    /* eslint-disable @typescript-eslint/naming-convention */
    param_FirehoseStreamNameForLogs: logsStreamName,
    param_FirehoseStreamNameForMetrics: metricsStreamName,
    param_ElasticEndpointURL: elasticsearchUrl,
    param_ElasticAPIKey: encodedApiKey,
    /* eslint-enable @typescript-eslint/naming-convention */
  });

  url.pathname = '/cloudformation/home';
  url.hash = `/stacks/quickcreate?${params.toString()}`;

  return url.toString();
}
