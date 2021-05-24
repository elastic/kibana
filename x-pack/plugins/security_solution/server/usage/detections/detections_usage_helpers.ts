/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, SavedObjectsClientContract } from '../../../../../../src/core/server';
import { isJobStarted } from '../../../common/machine_learning/helpers';
import { isSecurityJob } from '../../../common/machine_learning/is_security_job';
import { MlPluginSetup } from '../../../../ml/server';
import { MlJobsUsage } from './index';

interface DetectionsMetric {
  isElastic: boolean;
  isEnabled: boolean;
}

/**
 * Default ml job usage count
 */
export const initialMlJobsUsage: MlJobsUsage = {
  custom: {
    enabled: 0,
    disabled: 0,
  },
  elastic: {
    enabled: 0,
    disabled: 0,
  },
};

const updateMlJobsUsage = (jobMetric: DetectionsMetric, usage: MlJobsUsage): MlJobsUsage => {
  const { isEnabled, isElastic } = jobMetric;
  if (isEnabled && isElastic) {
    return {
      ...usage,
      elastic: {
        ...usage.elastic,
        enabled: usage.elastic.enabled + 1,
      },
    };
  } else if (!isEnabled && isElastic) {
    return {
      ...usage,
      elastic: {
        ...usage.elastic,
        disabled: usage.elastic.disabled + 1,
      },
    };
  } else if (isEnabled && !isElastic) {
    return {
      ...usage,
      custom: {
        ...usage.custom,
        enabled: usage.custom.enabled + 1,
      },
    };
  } else if (!isEnabled && !isElastic) {
    return {
      ...usage,
      custom: {
        ...usage.custom,
        disabled: usage.custom.disabled + 1,
      },
    };
  } else {
    return usage;
  }
};

export const getMlJobsUsage = async (
  ml: MlPluginSetup | undefined,
  savedObjectClient: SavedObjectsClientContract
): Promise<MlJobsUsage> => {
  let jobsUsage: MlJobsUsage = initialMlJobsUsage;

  if (ml) {
    try {
      const fakeRequest = { headers: {} } as KibanaRequest;

      const modules = await ml.modulesProvider(fakeRequest, savedObjectClient).listModules();
      const moduleJobs = modules.flatMap((module) => module.jobs);
      const jobs = await ml.jobServiceProvider(fakeRequest, savedObjectClient).jobsSummary();

      jobsUsage = jobs.filter(isSecurityJob).reduce((usage, job) => {
        const isElastic = moduleJobs.some((moduleJob) => moduleJob.id === job.id);
        const isEnabled = isJobStarted(job.jobState, job.datafeedState);

        return updateMlJobsUsage({ isElastic, isEnabled }, usage);
      }, initialMlJobsUsage);
    } catch (e) {
      // ignore failure, usage will be zeroed
    }
  }

  return jobsUsage;
};
