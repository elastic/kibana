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
            defaultMessage="Machine learning rules specify ML jobs that in
            turn have dependencies on data fields populated by the Elastic
            beats and agent integrations that were current when the ML job
            was created. New ML jobs, prefixed with V2, have been updated to
            operate on now-current ECS fields. If you are using multiple
            versions of beats and agents, you need to create new machine
            learning rules that specify the new ML (V2) jobs, and enable them
            to run alongside your existing machine learning rules, in order
            to ensure continued rule coverage."
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
