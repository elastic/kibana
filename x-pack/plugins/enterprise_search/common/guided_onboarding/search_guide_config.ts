/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GuideConfig } from '@kbn/guided-onboarding';
import { i18n } from '@kbn/i18n';

export const searchGuideId = 'search';
export const searchGuideConfig: GuideConfig = {
  title: i18n.translate('xpack.enterpriseSearch.guideConfig.title', {
    defaultMessage: 'Search my data',
  }),
  description: i18n.translate('xpack.enterpriseSearch.guideConfig.description', {
    defaultMessage:
      'Build custom search experiences with your data using Elastic’s out-of-the-box web crawler, connectors, and robust APIs. Gain deep insights from the built-in search analytics to curate results and optimize relevance.',
  }),
  guideName: 'Enterprise Search',
  telemetryId: 'search',
  steps: [
    {
      id: 'add_data',
      title: i18n.translate('xpack.enterpriseSearch.guideConfig.addDataStep.title', {
        defaultMessage: 'Add data',
      }),
      descriptionList: [
        i18n.translate('xpack.enterpriseSearch.guideConfig.addDataStep.description1', {
          defaultMessage: 'Select an ingestion method.',
        }),
        i18n.translate('xpack.enterpriseSearch.guideConfig.addDataStep.description2', {
          defaultMessage: 'Create a new Elasticsearch index.',
        }),
        i18n.translate('xpack.enterpriseSearch.guideConfig.addDataStep.description3', {
          defaultMessage: 'Configure your ingestion settings.',
        }),
      ],
      location: {
        appID: 'enterpriseSearchContent',
        path: '/search_indices/new_index',
      },
    },
    {
      id: 'search_experience',
      title: i18n.translate('xpack.enterpriseSearch.guideConfig.searchExperienceStep.title', {
        defaultMessage: 'Build a search experience',
      }),
      descriptionList: [
        i18n.translate(
          'xpack.enterpriseSearch.guideConfig.searchExperienceStep.descriptionList.item1',
          {
            defaultMessage: 'Learn more about Elastic’s Search UI framework.',
          }
        ),
        i18n.translate(
          'xpack.enterpriseSearch.guideConfig.searchExperienceStep.descriptionList.item2',
          {
            defaultMessage: 'Try the Search UI tutorial for Elasticsearch.',
          }
        ),
        i18n.translate(
          'xpack.enterpriseSearch.guideConfig.searchExperienceStep.descriptionList.item3',
          {
            defaultMessage:
              'Build a world-class search experience for your customers, employees, or users.',
          }
        ),
      ],
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
            defaultMessage:
              'Take your time to explore how to use Search UI to build world-class search experiences. When you’re ready, click the Setup guide button to continue.',
          }
        ),
        readyToCompleteOnNavigation: true,
      },
    },
  ],
};
