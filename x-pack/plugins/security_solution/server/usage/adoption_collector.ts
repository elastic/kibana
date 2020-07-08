/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyAPICaller } from '../../../../../src/core/server';
import { SERVER_APP_ID } from '../../common/constants';
import { SetupPlugins } from '../plugin';
import { AdoptionUsage } from './types';
import { buildRuleStats, buildMlJobStats, fetchRules, fetchJobs } from './adoption_helpers';

type CollectorDependencies = { kibanaIndex: string } & Pick<SetupPlugins, 'ml' | 'usageCollection'>;
export type RegisterAdoptionCollector = (deps: CollectorDependencies) => void;

export const registerAdoptionCollector: RegisterAdoptionCollector = ({
  kibanaIndex,
  ml,
  usageCollection,
}) => {
  if (!usageCollection) {
    return;
  }

  const collector = usageCollection.makeUsageCollector<AdoptionUsage>({
    type: `${SERVER_APP_ID}:adoption`,
    schema: {
      detection_rules_custom_enabled: { type: 'number' },
      detection_rules_custom_disabled: { type: 'number' },
      detection_rules_elastic_enabled: { type: 'number' },
      detection_rules_elastic_disabled: { type: 'number' },
      ml_jobs_custom_enabled: { type: 'number' },
      ml_jobs_custom_disabled: { type: 'number' },
      ml_jobs_elastic_enabled: { type: 'number' },
      ml_jobs_elastic_disabled: { type: 'number' },
    },
    isReady: () => true,
    fetch: buildFetch(kibanaIndex, ml),
  });

  usageCollection.registerCollector(collector);
};

export const buildFetch = (kibanaIndex: string, ml: CollectorDependencies['ml']) => async (
  callCluster: LegacyAPICaller
): Promise<AdoptionUsage> => {
  const rules = await fetchRules(kibanaIndex, callCluster);
  const jobs = await fetchJobs(ml);

  return { ...buildRuleStats(rules), ...buildMlJobStats(jobs) };
};
