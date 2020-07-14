/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchParams } from 'elasticsearch';
import { ILegacyScopedClusterClient, KibanaRequest } from 'kibana/server';

import { LegacyAPICaller, SavedObjectsClient } from '../../../../../../src/core/server';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { jobServiceProvider } from '../../../../ml/server/models/job_service';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { DataRecognizer } from '../../../../ml/server/models/data_recognizer';
import { MlPluginSetup } from '../../../../ml/server';
import { SIGNALS_ID, INTERNAL_IMMUTABLE_KEY } from '../../../common/constants';
import { DetectionRulesUsage, MlJobsUsage } from './index';
import { isJobStarted } from '../../../common/machine_learning/helpers';

interface DetectionsMetric {
  isElastic: boolean;
  isEnabled: boolean;
}

const isElasticRule = (tags: string[]) => tags.includes(`${INTERNAL_IMMUTABLE_KEY}:true`);

const initialRulesUsage: DetectionRulesUsage = {
  custom: {
    enabled: 0,
    disabled: 0,
  },
  elastic: {
    enabled: 0,
    disabled: 0,
  },
};

const initialMlJobsUsage: MlJobsUsage = {
  custom: {
    enabled: 0,
    disabled: 0,
  },
  elastic: {
    enabled: 0,
    disabled: 0,
  },
};

const updateRulesUsage = (
  ruleMetric: DetectionsMetric,
  usage: DetectionRulesUsage
): DetectionRulesUsage => {
  const { isEnabled, isElastic } = ruleMetric;
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

export const getRulesUsage = async (
  index: string,
  callCluster: LegacyAPICaller
): Promise<DetectionRulesUsage> => {
  let rulesUsage: DetectionRulesUsage = initialRulesUsage;
  const ruleSearchOptions: SearchParams = {
    body: { query: { bool: { filter: { term: { 'alert.alertTypeId': SIGNALS_ID } } } } },
    filterPath: ['hits.hits._source.alert.enabled', 'hits.hits._source.alert.tags'],
    ignoreUnavailable: true,
    index,
    size: 10000, // elasticsearch index.max_result_window default value
  };

  try {
    const ruleResults = await callCluster<{ alert: { enabled: boolean; tags: string[] } }>(
      'search',
      ruleSearchOptions
    );

    if (ruleResults.hits?.hits?.length > 0) {
      rulesUsage = ruleResults.hits.hits.reduce((usage, hit) => {
        const isElastic = isElasticRule(hit._source.alert.tags);
        const isEnabled = hit._source.alert.enabled;

        return updateRulesUsage({ isElastic, isEnabled }, usage);
      }, initialRulesUsage);
    }
  } catch (e) {
    // ignore failure, usage will be zeroed
  }

  return rulesUsage;
};

export const getMlJobsUsage = async (ml: MlPluginSetup | undefined): Promise<MlJobsUsage> => {
  let jobsUsage: MlJobsUsage = initialMlJobsUsage;

  // Fake objects to be passed to ML functions.
  // TODO - These ML functions should come from ML's setup contract
  // and not be imported directly.
  const fakeScopedClusterClient = {
    callAsCurrentUser: ml?.mlClient.callAsInternalUser,
    callAsInternalUser: ml?.mlClient.callAsInternalUser,
  } as ILegacyScopedClusterClient;
  const fakeSavedObjectsClient = {} as SavedObjectsClient;
  const fakeRequest = {} as KibanaRequest;

  if (ml) {
    try {
      const modules = await new DataRecognizer(
        fakeScopedClusterClient,
        fakeSavedObjectsClient,
        fakeRequest
      ).listModules();
      const moduleJobs = modules.flatMap((module) => module.jobs);
      const jobs = await jobServiceProvider(fakeScopedClusterClient).jobsSummary(['siem']);

      jobsUsage = jobs.reduce((usage, job) => {
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
