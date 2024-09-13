/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GuideConfig, StepConfig } from '@kbn/guided-onboarding';
import { i18n } from '@kbn/i18n';

export const appSearchGuideId = 'appSearch';
export const websiteSearchGuideId = 'websiteSearch';
export const databaseSearchGuideId = 'databaseSearch';

const apiRoutes = {
  [appSearchGuideId]: '/search_indices/new_index/api',
  [databaseSearchGuideId]: '/connectors/select_connector',
  [websiteSearchGuideId]: '/crawlers',
};

export type EnterpriseSearchGuideIds =
  | typeof appSearchGuideId
  | typeof websiteSearchGuideId
  | typeof databaseSearchGuideId;

const getAddDataStep: (method?: EnterpriseSearchGuideIds) => StepConfig = (method) => {
  return {
    id: 'add_data',
    title: i18n.translate('xpack.enterpriseSearch.guideConfig.addDataStep.title', {
      defaultMessage: 'Add data',
    }),
    description: i18n.translate('xpack.enterpriseSearch.guideConfig.addDataStep.description', {
      defaultMessage:
        'Ingest your data, create an index, and enrich your data with customizable ingest and inference pipelines.',
    }),
    location: {
      appID: 'enterpriseSearchContent',
      path: `${method ? apiRoutes[method] : '/search_indices/new_index'}`,
    },
  };
};

const getSearchExperienceStep: () => StepConfig = () => {
  return {
    id: 'search_experience',
    title: i18n.translate('xpack.enterpriseSearch.guideConfig.searchExperienceStep.title', {
      defaultMessage: 'Build a search experience',
    }),
    description: i18n.translate(
      'xpack.enterpriseSearch.guideConfig.searchExperienceStep.description',
      {
        defaultMessage: `Learn more about Elastic's Search UI, try our Search UI tutorial for Elasticsearch, and build a search experience.`,
      }
    ),
    location: {
      appID: 'searchExperiences',
      path: '',
    },
    manualCompletion: {
      title: i18n.translate(
        'xpack.enterpriseSearch.guideConfig.searchExperienceStep.manualCompletionPopoverTitle',
        {
          defaultMessage: 'Explore Search UI',
        }
      ),
      description: i18n.translate(
        'xpack.enterpriseSearch.guideConfig.searchExperienceStep.manualCompletionPopoverDescription',
        {
          defaultMessage: `Take your time to explore how to use Search UI to build world-class search experiences. When you're ready, click the Setup guide button to continue.`,
        }
      ),
      readyToCompleteOnNavigation: true,
    },
  };
};

const getGuideConfig: (telemetryId: EnterpriseSearchGuideIds) => GuideConfig = (telemetryId) => {
  return {
    telemetryId,
    title: i18n.translate('xpack.enterpriseSearch.guideConfig.title', {
      defaultMessage: 'Build search experiences with Elasticsearch',
    }),
    description: i18n.translate('xpack.enterpriseSearch.guideConfig.description', {
      defaultMessage: `We'll help you build a search experience with your data using Elastic's web crawler, connectors, and APIs.`,
    }),
    guideName: 'Enterprise Search',
    steps: [getAddDataStep(telemetryId), getSearchExperienceStep()],
  };
};

export const appSearchGuideConfig: GuideConfig = getGuideConfig(appSearchGuideId);

export const websiteSearchGuideConfig: GuideConfig = getGuideConfig(websiteSearchGuideId);

export const databaseSearchGuideConfig: GuideConfig = getGuideConfig(databaseSearchGuideId);
