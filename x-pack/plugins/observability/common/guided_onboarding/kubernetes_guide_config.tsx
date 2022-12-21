/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GuideConfig } from '@kbn/guided-onboarding-plugin/common';
import { i18n } from '@kbn/i18n';

export const kubernetesGuideId = 'kubernetes';
export const kubernetesGuideConfig: GuideConfig = {
  title: i18n.translate('xpack.observability.guideConfig.title', {
    defaultMessage: 'Observe my Kubernetes infrastructure',
  }),
  description: i18n.translate('xpack.observability.guideConfig.description', {
    defaultMessage: `We'll help you quickly get visibility into your Kubernetes environment with our Elastic integration. Gain deep insights from your logs, metrics, and traces to proactively detect issues and take action to resolve them.`,
  }),
  guideName: 'Kubernetes',
  telemetryId: 'kubernetes',
  docs: {
    text: i18n.translate('xpack.observability.guideConfig.documentationLink', {
      defaultMessage: 'Learn more',
    }),
    url: 'https://docs.elastic.co/en/integrations/kubernetes',
  },
  steps: [
    {
      id: 'add_data',
      title: i18n.translate('xpack.observability.guideConfig.addDataStep.title', {
        defaultMessage: 'Add and verify your data',
      }),
      integration: 'kubernetes',
      descriptionList: [
        {
          descriptionText: i18n.translate(
            'xpack.observability.guideConfig.addDataStep.descriptionList.item1.descriptionText',
            {
              defaultMessage: 'Deploy kube-state-metrics service to your Kubernetes.',
            }
          ),
          linkText: i18n.translate(
            'xpack.observability.guideConfig.addDataStep.descriptionList.item1.linkText',
            {
              defaultMessage: 'Learn more',
            }
          ),
          linkUrl: 'https://github.com/kubernetes/kube-state-metrics',
          isLinkExternal: true,
        },
        i18n.translate('xpack.observability.guideConfig.addDataStep.descriptionList.item2', {
          defaultMessage: 'Add the Elastic Kubernetes integration.',
        }),
      ],
      location: {
        appID: 'integrations',
        path: '/detail/kubernetes/overview',
      },
    },
    {
      id: 'view_dashboard',
      title: i18n.translate('xpack.observability.guideConfig.viewDashboardStep.title', {
        defaultMessage: 'Explore Kubernetes metrics',
      }),
      description: i18n.translate('xpack.observability.guideConfig.viewDashboardStep.description', {
        defaultMessage: 'Stream, visualize, and analyze your Kubernetes infrastructure metrics.',
      }),
      location: {
        appID: 'dashboards',
        path: '#/view/kubernetes-f4dc26db-1b53-4ea2-a78b-1bfab8ea267c',
      },
      manualCompletion: {
        title: i18n.translate(
          'xpack.observability.guideConfig.viewDashboardStep.manualCompletionPopoverTitle',
          {
            defaultMessage: 'Explore Kubernetes dashboards',
          }
        ),
        description: i18n.translate(
          'xpack.observability.guideConfig.viewDashboardStep.manualCompletionPopoverDescription',
          {
            defaultMessage: `Take your time to explore these pre-built dashboards included with the Kubernetes integration. When you’re ready, click the Setup guide button to continue.`,
          }
        ),
        readyToCompleteOnNavigation: true,
      },
    },
    {
      id: 'tour_observability',
      title: i18n.translate('xpack.observability.guideConfig.tourObservabilityStep.title', {
        defaultMessage: 'Tour Elastic Observability',
      }),
      description: i18n.translate(
        'xpack.observability.guideConfig.tourObservabilityStep.description',
        {
          defaultMessage:
            'Get familiar with the rest of Elastic Observability and explore even more integrations.',
        }
      ),
      location: {
        appID: 'observability',
        path: '/overview',
      },
    },
  ],
};
