/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiLink, EuiSpacer, EuiTitle } from '@elastic/eui';
import { LinkAnchor } from '@kbn/security-solution-navigation/links';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import styled from '@emotion/styled';
import { euiThemeVars } from '@kbn/ui-theme';
import * as i18n from '../translations';
import { RiskInformationFlyout } from './risk_information';

export const RiskScoreUsefulLinksSection = () => {
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);

  const handleOnOpen = () => setIsFlyoutVisible(true);
  const handleOnClose = () => setIsFlyoutVisible(false);
  const StyledList = styled.ul`
    list-style-type: disc;
    padding-left: ${euiThemeVars.euiSizeM};
  `;

  return (
    <>
      <EuiTitle>
        <h2>{i18n.USEFUL_LINKS}</h2>
      </EuiTitle>
      <EuiSpacer />
      <StyledList>
        <li>
          <LinkAnchor id={SecurityPageName.entityAnalytics}>{i18n.EA_DASHBOARD_LINK}</LinkAnchor>
          <EuiSpacer size="s" />
        </li>
        <li>
          <EuiLink onClick={handleOnOpen} data-test-subj="open-risk-information-flyout-trigger">
            {i18n.EA_DOCS_ENTITY_RISK_SCORE}
          </EuiLink>
          {isFlyoutVisible && <RiskInformationFlyout handleOnClose={handleOnClose} />}
          <EuiSpacer size="s" />
        </li>
      </StyledList>
    </>
  );
};
