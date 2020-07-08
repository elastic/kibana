/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchParams } from 'elasticsearch';

import { LegacyAPICaller, SavedObjectsClient } from '../../../../../src/core/server';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { jobServiceProvider } from '../../../ml/server/models/job_service';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { DataRecognizer } from '../../../ml/server/models/data_recognizer';
import { MlPluginSetup } from '../../../ml/server';
import { SIGNALS_ID, INTERNAL_IMMUTABLE_KEY } from '../../common/constants';
import { DetectionRulesAdoptionUsage, MlJobsAdoptionUsage } from './types';
import { isJobStarted } from '../../common/machine_learning/helpers';

interface AdoptionMetric {
  isElastic: boolean;
  isEnabled: boolean;
}

const isElasticRule = (tags: string[]) => tags.includes(`${INTERNAL_IMMUTABLE_KEY}:true`);

const initialRuleStats: DetectionRulesAdoptionUsage = {
  detection_rules_custom_enabled: 0,
  detection_rules_custom_disabled: 0,
  detection_rules_elastic_enabled: 0,
  detection_rules_elastic_disabled: 0,
};

const initialMlJobStats: MlJobsAdoptionUsage = {
  ml_jobs_custom_enabled: 0,
  ml_jobs_custom_disabled: 0,
  ml_jobs_elastic_enabled: 0,
  ml_jobs_elastic_disabled: 0,
};

export const buildRuleStats = (rulesMetrics: AdoptionMetric[]): DetectionRulesAdoptionUsage =>
  rulesMetrics.reduce((stats, { isEnabled, isElastic }) => {
    if (isEnabled && isElastic) {
      return {
        ...stats,
        detection_rules_elastic_enabled: stats.detection_rules_elastic_enabled + 1,
      };
    } else if (!isEnabled && isElastic) {
      return {
        ...stats,
        detection_rules_elastic_disabled: stats.detection_rules_elastic_disabled + 1,
      };
    } else if (isEnabled && !isElastic) {
      return {
        ...stats,
        detection_rules_custom_enabled: stats.detection_rules_custom_enabled + 1,
      };
    } else if (!isEnabled && !isElastic) {
      return {
        ...stats,
        detection_rules_custom_disabled: stats.detection_rules_custom_disabled + 1,
      };
    } else {
      return stats;
    }
  }, initialRuleStats);

export const buildMlJobStats = (jobMetrics: AdoptionMetric[]): MlJobsAdoptionUsage =>
  jobMetrics.reduce((stats, { isEnabled, isElastic }) => {
    if (isEnabled && isElastic) {
      return {
        ...stats,
        ml_jobs_elastic_enabled: stats.ml_jobs_elastic_enabled + 1,
      };
    } else if (!isEnabled && isElastic) {
      return {
        ...stats,
        ml_jobs_elastic_disabled: stats.ml_jobs_elastic_disabled + 1,
      };
    } else if (isEnabled && !isElastic) {
      return {
        ...stats,
        ml_jobs_custom_enabled: stats.ml_jobs_custom_enabled + 1,
      };
    } else if (!isEnabled && !isElastic) {
      return {
        ...stats,
        ml_jobs_custom_disabled: stats.ml_jobs_custom_disabled + 1,
      };
    } else {
      return stats;
    }
  }, initialMlJobStats);

export const fetchRules = async (
  index: string,
  callCluster: LegacyAPICaller
): Promise<AdoptionMetric[]> => {
  let ruleMetrics: AdoptionMetric[] = [];
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
      ruleMetrics = ruleResults.hits.hits.map((hit) => ({
        isElastic: isElasticRule(hit._source.alert.tags),
        isEnabled: hit._source.alert.enabled,
      }));
    }
  } catch (e) {
    // ignore failure, rules will be empty
  }

  return ruleMetrics;
};

const mlJobGroupId = 'siem';
export const fetchJobs = async (ml: MlPluginSetup | undefined): Promise<AdoptionMetric[]> => {
  let jobMetrics: AdoptionMetric[] = [];

  if (ml) {
    try {
      const mlCaller = ml.mlClient.callAsInternalUser;
      const modules = await new DataRecognizer(
        mlCaller,
        ({} as unknown) as SavedObjectsClient
      ).listModules();
      const moduleJobs = modules.flatMap((module) => module.jobs);
      const jobs = await jobServiceProvider(mlCaller).jobsSummary([mlJobGroupId]);

      jobMetrics = jobs.map((job) => ({
        isElastic: moduleJobs.some((moduleJob) => moduleJob.id === job.id),
        isEnabled: isJobStarted(job.jobState, job.datafeedState),
      }));
    } catch (e) {
      // ignore failure, jobs will be empty
    }
  }

  return jobMetrics;
};
