/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { MlJobCompatibilityLink } from '../../../../common/components/links_to_docs';

export const ML_JOB_COMPATIBILITY_CALLOUT_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.mlJobCompatibilityCallout.messageTitle',
  {
    defaultMessage:
      'New updates are available for your ML jobs, please see documentation before updating Detection Rules to ensure continued coverage',
  }
);

export const MlJobCompatibilityCalloutBody = () => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.mlJobCompatibilityCallout.messageBody"
    defaultMessage="{summary} Documentation: {docs}"
    values={{
      summary: (
        <p>
          <FormattedMessage
            id="xpack.securitySolution.detectionEngine.mlJobCompatibilityCallout.messageBody.summary"
            defaultMessage="New V3 Machine Learning jobs have been released and
            the corresponding Detections Rules have been updated to use these
            new jobs. You are currently running one or more V1/V2 jobs and
            action is required to ensure continued coverage before updating
            your Detection Rules. Please see the below documentation for
            instructions on how to keep using the V1/V2 jobs, and how
            to start using the new V3 jobs."
          />
        </p>
      ),
      docs: (
        <ul>
          <li>
            <MlJobCompatibilityLink />
          </li>
        </ul>
      ),
    }}
  />
);
