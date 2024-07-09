/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function buildCreateStackCommand({
  templateUrl,
  stackName,
  streamName,
  encodedApiKey,
  elasticsearchUrl,
}: {
  templateUrl: string;
  stackName: string;
  streamName: string;
  encodedApiKey: string;
  elasticsearchUrl: string;
}) {
  const escapedElasticsearchUrl = elasticsearchUrl.replace(/\//g, '\\/');
  const escapedTemplateUrl = templateUrl.replace(/\//g, '\\/');

  return `
    aws cloudformation create-stack
      --stack-name ${stackName}
      --template-url ${escapedTemplateUrl}
      --parameters ParameterKey=FirehoseStreamName,ParameterValue=${streamName}
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
