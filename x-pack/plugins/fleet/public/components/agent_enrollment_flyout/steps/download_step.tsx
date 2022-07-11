/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import type { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';

import { DownloadInstructions } from '../download_instructions';

export const DownloadStep = (
  hasFleetServer: boolean,
  enrollmentAPIKey?: string
): EuiContainedStepProps => {
  const altTitle = i18n.translate('xpack.fleet.agentEnrollment.stepDownloadAgentForK8sTitle', {
    defaultMessage: 'Download the Elastic Agent Manifest',
  });

  const title = hasFleetServer
    ? i18n.translate('xpack.fleet.agentEnrollment.stepDownloadAgentForFleetServerTitle', {
        defaultMessage: 'Download the Fleet Server to a centralized host',
      })
    : altTitle;

  return {
    title,
    children: (
      <DownloadInstructions hasFleetServer={hasFleetServer} enrollmentAPIKey={enrollmentAPIKey} />
    ),
  };
};
