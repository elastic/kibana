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

export const READ_ONLY_RULES_CALLOUT_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.readOnlyRulesCallOut.messageTitle',
  {
    defaultMessage: 'Rule permissions required',
  }
);

export const readOnlyRulesCallOutBody = () => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.readOnlyRulesCallOut.messageBody.messageDetail"
    defaultMessage="{essence} Related documentation: {docs}"
    values={{
      essence: (
        <p>
          <FormattedMessage
            id="xpack.securitySolution.detectionEngine.readOnlyRulesCallOut.messageBody.essenceDescription"
            defaultMessage="You are currently missing the required permissions to create/edit detection engine rule. Please contact your administrator for further assistance."
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
