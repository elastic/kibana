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
  showOverlay: boolean;
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
        'Take a quick tour of the Observability solution to get a feel for how it works.',
    }),
    anchor: `[id^="KibanaPageTemplateSolutionNav"]`,
    anchorPosition: 'rightUp',
    dataTestSubj: 'overviewStep',
    showOverlay: true,
  },
  {
    title: i18n.translate('xpack.observability.tour.streamStep.tourTitle', {
      defaultMessage: 'View all your infrastructure logs in real time',
    }),
    content: i18n.translate('xpack.observability.tour.streamStep.tourContent', {
      defaultMessage: 'Verify your data is flowing correctly.',
    }),
    anchor: `[data-nav-id="stream"]`,
    anchorPosition: 'rightUp',
    dataTestSubj: 'streamStep',
    showOverlay: true,
    imageConfig: {
      name: 'onboarding_tour_step_logs.gif',
      altText: i18n.translate('xpack.observability.tour.streamStep.imageAltText', {
        defaultMessage: 'Logs stream demonstration',
      }),
    },
  },
  {
    title: i18n.translate('xpack.observability.tour.metricsExplorerStep.tourTitle', {
      defaultMessage: 'Inspect your overall infrastructure performance',
    }),
    content: i18n.translate('xpack.observability.tour.metricsExplorerStep.tourContent', {
      defaultMessage: 'Check the health of your infrastructure.',
    }),
    anchor: `[data-nav-id="metrics_explorer"]`,
    anchorPosition: 'rightUp',
    dataTestSubj: 'metricsExplorerStep',
    showOverlay: true,
    imageConfig: {
      name: 'onboarding_tour_step_metrics.gif',
      altText: i18n.translate('xpack.observability.tour.metricsExplorerStep.imageAltText', {
        defaultMessage: 'Metrics explorer demonstration',
      }),
    },
  },
  {
    title: i18n.translate('xpack.observability.tour.tracesStep.tourTitle', {
      defaultMessage: 'Understand the entire lifecycle of a request/action',
    }),
    content: i18n.translate('xpack.observability.tour.tracesStep.tourContent', {
      defaultMessage: 'Track down any issues affecting your infrastructure.',
    }),
    anchor: `[data-nav-id="traces"]`,
    anchorPosition: 'rightUp',
    dataTestSubj: 'tracesStep',
    showOverlay: true,
    imageConfig: {
      name: 'onboarding_tour_step_traces.gif',
      altText: i18n.translate('xpack.observability.tour.tracesStep.imageAltText', {
        defaultMessage: 'Traces demonstration',
      }),
    },
  },
  {
    title: i18n.translate('xpack.observability.tour.alertsStep.tourTitle', {
      defaultMessage: 'Get notified when something goes wrong',
    }),
    content: i18n.translate('xpack.observability.tour.alertsStep.tourContent', {
      defaultMessage: 'Configure how you want to be notified when a problem occurs.',
    }),
    anchor: `[data-nav-id="alerts"]`,
    anchorPosition: 'rightUp',
    dataTestSubj: 'alertStep',
    showOverlay: true,
    imageConfig: {
      name: 'onboarding_tour_step_alerts.gif',
      altText: i18n.translate('xpack.observability.tour.alertsStep.imageAltText', {
        defaultMessage: 'Alerts demonstration',
      }),
    },
  },
  {
    title: i18n.translate('xpack.observability.tour.guidedSetupStep.tourTitle', {
      defaultMessage: `You're ready!`,
    }),
    content: i18n.translate('xpack.observability.tour.guidedSetupStep.tourContent', {
      defaultMessage: 'View the guided setup to learn about next steps.',
    }),
    anchor: '#guidedSetupButton',
    anchorPosition: 'rightUp',
    dataTestSubj: 'guidedSetupStep',
    showOverlay: false,
  },
];
