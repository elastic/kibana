/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { MlJobCompatibilityLink } from '../../../../common/components/links_to_docs';

export const ML_JOB_COMPATIBILITY_CALLOUT_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.mlJobCompatibilityCallout.messageTitle',
  {
    defaultMessage: 'TODO title',
  }
);

export const MlJobCompatibilityCalloutBody = () => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.mlJobCompatibilityCallout.messageBody"
    defaultMessage="{summary} Related documentation: {docs}"
    values={{
      summary: (
        <p>
          <FormattedMessage
            id="xpack.securitySolution.detectionEngine.mlJobCompatibilityCallout.messageBody.summary"
            defaultMessage="TODO summary"
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
