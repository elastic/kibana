/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';

export function getContextMessage({
  serviceName,
  serviceEnvironment,
  serviceSummary,
  downstreamDependencies,
  logCategories,
  serviceChangePoints,
  exitSpanChangePoints,
  anomalies,
}: any): string {
  const obsAlertContext = `${
    !isEmpty(serviceSummary)
      ? `Metadata for the service where the alert occurred:
${JSON.stringify(serviceSummary, null, 2)}`
      : ''
  }

    ${
      !isEmpty(downstreamDependencies)
        ? `Downstream dependencies from the service "${serviceName}". Problems in these services can negatively affect the performance of "${serviceName}":
${JSON.stringify(downstreamDependencies, null, 2)}`
        : ''
    }
    
    ${
      !isEmpty(serviceChangePoints)
        ? `Significant change points for "${serviceName}". Use this to spot dips and spikes in throughput, latency and failure rate:
    ${JSON.stringify(serviceChangePoints, null, 2)}`
        : ''
    }
  
    ${
      !isEmpty(exitSpanChangePoints)
        ? `Significant change points for the dependencies of "${serviceName}". Use this to spot dips or spikes in throughput, latency and failure rate for downstream dependencies:
    ${JSON.stringify(exitSpanChangePoints, null, 2)}`
        : ''
    }
    
    ${
      !isEmpty(logCategories)
        ? `Log events occurring around the time of the alert:
    ${JSON.stringify(logCategories, null, 2)}`
        : ''
    }
  
    ${
      !isEmpty(anomalies)
        ? `Anomalies for services running in the environment "${serviceEnvironment}":
    ${anomalies}`
        : ''
    }          
    `;

  return obsAlertContext;
}
