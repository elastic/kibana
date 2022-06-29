/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { EuiTourStepProps, ElementTarget } from '@elastic/eui';

interface TourStep {
  content: string;
  anchor: ElementTarget;
  anchorPosition: EuiTourStepProps['anchorPosition'];
  title: EuiTourStepProps['title'];
  dataTestSubj: string;
  imageConfig?: {
    name: string;
    altText: string;
  };
}

export const tourStepsConfig: TourStep[] = [
  {
    title: i18n.translate('xpack.observability.tour.observabilityOverviewStep.tourTitle', {
      defaultMessage: 'Welcome to Elastic Observability',
    }),
    content: i18n.translate('xpack.observability.tour.observabilityOverviewStep.tourContent', {
      defaultMessage:
        'Take a quick tour to learn the benefits of having all of your observability data in one stack.',
    }),
    anchor: `[id^="KibanaPageTemplateSolutionNav"]`,
    anchorPosition: 'rightUp',
    dataTestSubj: 'overviewStep',
  },
  {
    title: i18n.translate('xpack.observability.tour.streamStep.tourTitle', {
      defaultMessage: 'Tail your infrastructure logs in real time',
    }),
    content: i18n.translate('xpack.observability.tour.streamStep.tourContent', {
      defaultMessage:
        'Monitor, filter, and inspect log events flowing in from your applications, servers, virtual machines, and containers.',
    }),
    anchor: `[data-nav-id="stream"]`,
    anchorPosition: 'rightUp',
    dataTestSubj: 'streamStep',
    imageConfig: {
      name: 'onboarding_tour_step_logs.gif',
      altText: i18n.translate('xpack.observability.tour.streamStep.imageAltText', {
        defaultMessage: 'Logs stream demonstration',
      }),
    },
  },
  {
    title: i18n.translate('xpack.observability.tour.metricsExplorerStep.tourTitle', {
      defaultMessage: 'Monitor your infrastructure health',
    }),
    content: i18n.translate('xpack.observability.tour.metricsExplorerStep.tourContent', {
      defaultMessage:
        'Stream, group, and visualize metrics from your systems, cloud, network, and other infrastructure sources.',
    }),
    anchor: `[data-nav-id="metrics_explorer"]`,
    anchorPosition: 'rightUp',
    dataTestSubj: 'metricsExplorerStep',
    imageConfig: {
      name: 'onboarding_tour_step_metrics.gif',
      altText: i18n.translate('xpack.observability.tour.metricsExplorerStep.imageAltText', {
        defaultMessage: 'Metrics explorer demonstration',
      }),
    },
  },
  {
    title: i18n.translate('xpack.observability.tour.tracesStep.tourTitle', {
      defaultMessage: 'Identify and resolve application issues',
    }),
    content: i18n.translate('xpack.observability.tour.tracesStep.tourContent', {
      defaultMessage:
        'Find and fix performance problems quickly by collecting detailed information about your services.',
    }),
    anchor: `[data-nav-id="traces"]`,
    anchorPosition: 'rightUp',
    dataTestSubj: 'tracesStep',
    imageConfig: {
      name: 'onboarding_tour_step_traces.gif',
      altText: i18n.translate('xpack.observability.tour.tracesStep.imageAltText', {
        defaultMessage: 'Traces demonstration',
      }),
    },
  },
  {
    title: i18n.translate('xpack.observability.tour.alertsStep.tourTitle', {
      defaultMessage: 'Get notified when something changes',
    }),
    content: i18n.translate('xpack.observability.tour.alertsStep.tourContent', {
      defaultMessage:
        'Define and detect conditions that trigger alerts with third-party platform integrations like email, PagerDuty, and Slack.',
    }),
    anchor: `[data-nav-id="alerts"]`,
    anchorPosition: 'rightUp',
    dataTestSubj: 'alertStep',
    imageConfig: {
      name: 'onboarding_tour_step_alerts.gif',
      altText: i18n.translate('xpack.observability.tour.alertsStep.imageAltText', {
        defaultMessage: 'Alerts demonstration',
      }),
    },
  },
  {
    title: i18n.translate('xpack.observability.tour.guidedSetupStep.tourTitle', {
      defaultMessage: 'Now add your data!',
    }),
    content: i18n.translate('xpack.observability.tour.guidedSetupStep.tourContent', {
      defaultMessage:
        'The easiest way to get going with Elastic Observability is to follow the Guided setup.',
    }),
    anchor: '#guidedSetupButton',
    anchorPosition: 'rightUp',
    dataTestSubj: 'guidedSetupStep',
  },
];
