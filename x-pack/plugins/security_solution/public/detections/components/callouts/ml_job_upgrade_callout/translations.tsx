/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

export const ML_JOB_UPGRADE_CALLOUT_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.mlJobUpgradeCallout.messageTitle',
  {
    defaultMessage: 'TODO title',
  }
);

export const MlJobUpgradeCalloutBody = () => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.mlJobUpgradeCallout.messageBody"
    defaultMessage="{summary} Related documentation: {docs}"
    values={{
      summary: (
        <p>
          <FormattedMessage
            id="xpack.securitySolution.detectionEngine.mlJobUpgradeCallout.messageBody.summary"
            defaultMessage="TODO summary"
          />
        </p>
      ),
      docs: (
        <ul>
          <li>
            <a href="TODO">{'TODO'}</a>
          </li>
        </ul>
      ),
    }}
  />
);
