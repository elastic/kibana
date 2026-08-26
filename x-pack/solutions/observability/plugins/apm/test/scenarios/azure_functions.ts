/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Generates APM data for Azure Function invocations, including cold starts.
 */

import type { ApmFields } from '@kbn/synthtrace-client';
import { apm } from '@kbn/synthtrace-client';
import type { Scenario } from '@kbn/synthtrace';
import type { RunOptions } from '@kbn/synthtrace';
import { getSynthtraceEnvironment } from '@kbn/synthtrace';
import { withClient } from '@kbn/synthtrace';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const scenario: Scenario<ApmFields> = async (runOptions: RunOptions) => {
  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      const timestamps = range.ratePerMinute(180);

      const cloudFields: ApmFields = {
        'cloud.provider': 'azure',
        'cloud.service.name': 'functions',
        'cloud.region': 'Central US',
      };

      const instanceALambdaDotnet = apm
        .serverlessFunction({
          serviceName: 'azure-functions',
          environment: ENVIRONMENT,
          agentName: 'dotnet',
          functionName: 'fn-dotnet-1',
          serverlessType: 'azure.functions',
        })
        .instance({ instanceName: 'instance_A', ...cloudFields });

      const instanceALambdaDotnet2 = apm
        .serverlessFunction({
          serviceName: 'azure-functions',
          environment: ENVIRONMENT,
          agentName: 'dotnet',
          functionName: 'fn-dotnet-2',
          serverlessType: 'azure.functions',
        })
        .instance({ instanceName: 'instance_A', ...cloudFields });

      const instanceALambdaNode2 = apm
        .serverlessFunction({
          environment: ENVIRONMENT,
          agentName: 'nodejs',
          functionName: 'fn-node-1',
          serverlessType: 'azure.functions',
        })
        .instance({ instanceName: 'instance_A', ...cloudFields });

      const awsLambdaEvents = timestamps.generator((timestamp) => {
        return [
          instanceALambdaDotnet.invocation().duration(1000).timestamp(timestamp).coldStart(true),
          instanceALambdaDotnet2.invocation().duration(1000).timestamp(timestamp).coldStart(false),
          instanceALambdaNode2.invocation().duration(1000).timestamp(timestamp).coldStart(false),
        ];
      });

      return withClient(apmEsClient, awsLambdaEvents);
    },
  };
};

export default scenario;
