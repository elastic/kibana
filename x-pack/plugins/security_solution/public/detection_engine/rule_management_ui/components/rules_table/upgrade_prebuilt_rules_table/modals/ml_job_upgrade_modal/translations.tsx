/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { MlJobCompatibilityLink } from '../../../../../../../common/components/links_to_docs';

export const ML_JOB_UPGRADE_MODAL_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.mlJobUpgradeModal.messageTitle',
  {
    defaultMessage: 'ML rule updates may override your existing rules',
  }
);

export const ML_JOB_UPGRADE_MODAL_CANCEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.mlJobUpgradeModal.cancelTitle',
  {
    defaultMessage: 'Cancel',
  }
);

export const ML_JOB_UPGRADE_MODAL_CONFIRM = i18n.translate(
  'xpack.securitySolution.detectionEngine.mlJobUpgradeModal.confirmTitle',
  {
    defaultMessage: 'Load rules',
  }
);

export const ML_JOB_UPGRADE_MODAL_AFFECTED_JOBS = i18n.translate(
  'xpack.securitySolution.detectionEngine.mlJobUpgradeModal.affectedJobsTitle',
  {
    defaultMessage: 'Affected jobs:',
  }
);

export const MlJobUpgradeModalBody = () => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.mlJobUpgradeModal.messageBody"
    defaultMessage="{summary} Documentation: {docs}"
    values={{
      summary: (
        <p>
          <FormattedMessage
            id="xpack.securitySolution.detectionEngine.mlJobUpgradeModal.messageBody.summary"
            defaultMessage="New V3 machine learning jobs have been released,
            and the latest corresponding prebuilt detection rules now use these
            new ML jobs. You're currently running one or more V1/V2 jobs, which
            only work with legacy prebuilt rules. To ensure continued coverage using
            V1/V2 jobs, you may need to duplicate or create new rules before
            updating your Elastic prebuilt detection rules. Check the documentation
            below for instructions on how to keep using the V1/V2 jobs, and how to
            start using the new V3 jobs."
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
