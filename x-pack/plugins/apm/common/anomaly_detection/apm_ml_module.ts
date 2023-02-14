/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum ApmMlModule {
  ServiceDestination = `apm_service_destination`,
  Transaction = 'apm_transaction',
}

const JOB_ID_BY_APM_MODULE = {
  [ApmMlModule.ServiceDestination]: 'apm_service_destination_metrics',
  [ApmMlModule.Transaction]: 'apm_tx_metrics',
};

export function getApmMlModuleFromJob(jobId: string) {
  if (jobId.includes('high_mean_transaction_duration')) {
    // legacy
    return ApmMlModule.Transaction;
  }

  const module = [ApmMlModule.ServiceDestination, ApmMlModule.Transaction].find(
    (moduleId) => jobId.includes(JOB_ID_BY_APM_MODULE[moduleId])
  );

  if (!module) {
    throw new Error(`Could not match job ${jobId} to APM ML module`);
  }

  return module;
}
