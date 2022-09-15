/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiSpacer } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';

import type { RiskScoreEntity } from '../../../../../common/search_strategy';
import { VIEW_DASHBOARD } from '../../overview_cti_links/translations';
import { RiskScoreDocLink } from './risk_score_doc_link';

const StyledButton = styled(EuiButton)`
  float: right;
`;

export const useRiskScoreToastContent = (riskScoreEntity: RiskScoreEntity) => {
  const renderDocLink = useCallback(
    (message: string) => (
      <>
        {message} <RiskScoreDocLink riskScoreEntity={riskScoreEntity} />
      </>
    ),
    [riskScoreEntity]
  );
  const renderDashboardLink = useCallback(
    (message: string, targetUrl: string) => (
      <>
        {message}
        <EuiSpacer size="s" />
        <StyledButton href={targetUrl} target="_blank">
          {VIEW_DASHBOARD}
        </StyledButton>
      </>
    ),
    []
  );

  const renderLinks = useMemo(
    () => ({
      renderDocLink,
      renderDashboardLink,
    }),
    [renderDashboardLink, renderDocLink]
  );

  return renderLinks;
};
