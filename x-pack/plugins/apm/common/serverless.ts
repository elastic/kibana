/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Gets the serverless function name from serverless id.
 * Serverless id example: arn:aws:lambda:us-west-2:123456789012:function:my-function
 * The function name is the last part after "function:"
 */
const serverlessIdRegex = /function:(.*)/;
export function getServerlessFunctionNameFromId(serverlessId: string) {
  const match = serverlessIdRegex.exec(serverlessId);
  return match ? match[1] : serverlessId;
}

export enum ServerlessType {
  AWS_LAMBDA = 'aws.lambda',
  AZURE_FUNCTIONS = 'azure.functions',
}

export function getServerlessTypeFromCloudData(
  cloudProvider?: string,
  cloudServiceName?: string
): ServerlessType | undefined {
  if (
    cloudProvider?.toLowerCase() === 'aws' &&
    cloudServiceName?.toLowerCase() === 'lambda'
  ) {
    return ServerlessType.AWS_LAMBDA;
  } else if (
    cloudProvider?.toLowerCase() === 'azure' &&
    cloudServiceName?.toLowerCase() === 'functions'
  ) {
    return ServerlessType.AZURE_FUNCTIONS;
  } else {
    return undefined;
  }
}
