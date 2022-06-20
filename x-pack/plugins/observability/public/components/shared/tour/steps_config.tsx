/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import { EuiTourStepProps, EuiText, ElementTarget } from '@elastic/eui';

interface TourStep {
  content: EuiTourStepProps['content'];
  anchor: ElementTarget;
  anchorPosition: EuiTourStepProps['anchorPosition'];
  title: EuiTourStepProps['title'];
  dataTestSubj: string;
  showOverlay: boolean;
}

export const tourStepsConfig: TourStep[] = [
  {
    title: i18n.translate('xpack.observability.tour.observabilityOverviewStep.tourTitle', {
      defaultMessage: 'Welcome to Elastic Observability',
    }),
    content: (
      <EuiText>
        {i18n.translate('xpack.observability.tour.observabilityOverviewStep.tourContent', {
          defaultMessage:
            'Take a quick tour of the Observability solution to get a feel for how it works.',
        })}
      </EuiText>
    ),
    anchor: `[id^="KibanaPageTemplateSolutionNav"]`,
    anchorPosition: 'rightUp',
    dataTestSubj: 'overviewStep',
    showOverlay: true,
  },
  {
    title: i18n.translate('xpack.observability.tour.streamStep.tourTitle', {
      defaultMessage: 'View all your infrastructure logs in real time',
    }),
    content: (
      <EuiText>
        {i18n.translate('xpack.observability.tour.streamStep.tourContent', {
          defaultMessage: 'Verify your data is flowing correctly.',
        })}
      </EuiText>
    ),
    anchor: `[data-nav-id="stream"]`,
    anchorPosition: 'rightUp',
    dataTestSubj: 'streamStep',
    showOverlay: true,
  },
  {
    title: i18n.translate('xpack.observability.tour.metricsExplorerStep.tourTitle', {
      defaultMessage: 'Inspect your overall infrastructure performance',
    }),
    content: (
      <EuiText>
        {i18n.translate('xpack.observability.tour.metricsExplorerStep.tourContent', {
          defaultMessage: 'Check the health of your infrastructure.',
        })}
      </EuiText>
    ),
    anchor: `[data-nav-id="metrics_explorer"]`,
    anchorPosition: 'rightUp',
    dataTestSubj: 'metricsExplorerStep',
    showOverlay: true,
  },
  {
    title: i18n.translate('xpack.observability.tour.tracesStep.tourTitle', {
      defaultMessage: 'Understand the entire lifecycle of a request/action',
    }),
    content: (
      <EuiText>
        {i18n.translate('xpack.observability.tour.tracesStep.tourContent', {
          defaultMessage: 'Track down any issues affecting your infrastructure.',
        })}
      </EuiText>
    ),
    anchor: `[data-nav-id="traces"]`,
    anchorPosition: 'rightUp',
    dataTestSubj: 'tracesStep',
    showOverlay: true,
  },
  {
    title: i18n.translate('xpack.observability.tour.alertsStep.tourTitle', {
      defaultMessage: 'Get notified when something goes wrong',
    }),
    content: (
      <EuiText>
        {i18n.translate('xpack.observability.tour.alertsStep.tourContent', {
          defaultMessage: 'Configure how you want to be notified when a problem occurs.',
        })}
      </EuiText>
    ),
    anchor: `[data-nav-id="alerts"]`,
    anchorPosition: 'rightUp',
    dataTestSubj: 'alertStep',
    showOverlay: true,
  },
  {
    title: i18n.translate('xpack.observability.tour.guidedSetupStep.tourTitle', {
      defaultMessage: `You're ready!`,
    }),
    content: (
      <EuiText>
        {i18n.translate('xpack.observability.tour.guidedSetupStep.tourContent', {
          defaultMessage: 'View the guided setup to learn about next steps.',
        })}
      </EuiText>
    ),
    anchor: '#guidedSetupButton',
    anchorPosition: 'rightUp',
    dataTestSubj: 'guidedSetupStep',
    showOverlay: false,
  },
];
