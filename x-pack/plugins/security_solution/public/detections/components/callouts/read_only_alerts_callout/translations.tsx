/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  SecuritySolutionRequirementsLink,
  DetectionsRequirementsLink,
} from '../../../../common/components/links_to_docs';

export const READ_ONLY_ALERTS_CALLOUT_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.readOnlyAlertsCallOut.messageTitle',
  {
    defaultMessage: 'You cannot change alert states',
  }
);

export const readOnlyAlertsCallOutBody = () => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.readOnlyAlertsCallOut.messageBody.messageDetail"
    defaultMessage="{essence} Related documentation: {docs}"
    values={{
      essence: (
        <p>
          <FormattedMessage
            id="xpack.securitySolution.detectionEngine.readOnlyAlertsCallOut.messageBody.essenceDescription"
            defaultMessage="You only have permissions to view alerts. If you need to update alert states (open or close alerts), contact your Kibana administrator."
          />
        </p>
      ),
      docs: (
        <ul>
          <li>
            <DetectionsRequirementsLink />
          </li>
          <li>
            <SecuritySolutionRequirementsLink />
          </li>
        </ul>
      ),
    }}
  />
);
