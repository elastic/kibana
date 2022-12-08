/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiSpacer } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { FormattedMessage } from '../../../../private/var/tmp/_bazel_stephmilovic/f2692a3f20a774c59f0da1de1e889609/execroot/kibana/bazel-out/darwin_arm64-fastbuild/bin/packages/kbn-i18n-react';

import type { RiskScoreEntity } from '../../../../../common/search_strategy';
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
          <FormattedMessage
            id="xpack.securitySolution.risk_score.toast.viewDashboard"
            defaultMessage="View dashboard"
          />
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
