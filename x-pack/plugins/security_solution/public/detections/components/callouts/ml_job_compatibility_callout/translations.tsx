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
    defaultMessage: 'Your ML jobs may be incompatible with your data sources and/or ML rules',
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
            defaultMessage="The ML jobs that are installed are compatible
            with specific versions of ECS. To avoid missing alerts, ensure
            that your ML jobs are compatible with your data sources, and that
            your ML rules are configured with the appropriate ML jobs."
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
