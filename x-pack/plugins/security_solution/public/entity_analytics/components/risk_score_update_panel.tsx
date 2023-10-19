/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiText, EuiFlexGroup, EuiSpacer } from '@elastic/eui';
import * as i18n from '../translations';
import { SecuritySolutionLinkButton } from '../../common/components/links';
import { SecurityPageName } from '../../../common/constants';

export const RiskScoreUpdatePanel = () => {
  return (
    <>
      <EuiCallOut title={i18n.UPDATE_PANEL_TITLE} color="primary" iconType="starEmpty">
        <EuiText>{i18n.UPDATE_PANEL_MESSAGE}</EuiText>
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="m">
          <SecuritySolutionLinkButton
            color="primary"
            fill
            deepLinkId={SecurityPageName.entityAnalyticsManagement}
            data-test-subj="update-risk-score-button"
          >
            {i18n.UPDATE_PANEL_GO_TO_MANAGE}
          </SecuritySolutionLinkButton>
        </EuiFlexGroup>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};
