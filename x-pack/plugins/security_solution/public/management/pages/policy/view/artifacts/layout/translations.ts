/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

export const POLICY_ARTIFACT_LAYOUT_LABELS = Object.freeze({
  layoutTitle: i18n.translate('xpack.securitySolution.endpoint.policy.artifacts.layout.title', {
    defaultMessage: 'Assigned artifacts',
  }),
  layoutAssignButtonTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.artifacts.layout.assignToPolicy',
    {
      defaultMessage: 'Assign artifact to policy',
    }
  ),
  layoutViewAllLinkMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.artifacts.layout.about.viewAllLinkLabel',
    {
      defaultMessage: 'view all artifacts',
    }
  ),
  layoutAboutMessage: (count: number, _: React.ReactElement): React.ReactNode => {
    return i18n.translate('xpack.securitySolution.endpoint.policy.artifacts.layout.about', {
      defaultMessage:
        'There {count, plural, one {is} other {are}} {count} {count, plural, =1 {artifact} other {artifacts}} associated with this policy. Click here to view all artifacts',
      values: { count },
    });
  },
});
