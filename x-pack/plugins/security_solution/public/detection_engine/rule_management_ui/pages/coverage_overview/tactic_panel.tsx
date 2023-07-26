/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiProgress, EuiSpacer, EuiText, EuiToolTip } from '@elastic/eui';
import React, { memo, useMemo } from 'react';
import styled, { css } from 'styled-components';
import type { CoverageOverviewMitreTactic } from '../../../rule_management/model/coverage_overview/mitre_tactic';
import { getCoveredTechniques } from './helpers';
import { CoverageOverviewPanelMetadata } from './shared_components';
import * as i18n from './translations';

export interface CoverageOverviewTacticPanelProps {
  tactic: CoverageOverviewMitreTactic;
}

const TacticPanel = styled(EuiPanel)`
  ${({ theme }) => css`
    background: ${theme.eui.euiColorLightestShade};
    border-color: ${theme.eui.euiColorMediumShade};
  `}
`;

const TacticTitle = styled(EuiText)`
  h4 {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const CoverageOverviewTacticPanelComponent = ({ tactic }: CoverageOverviewTacticPanelProps) => {
  const coveredTechniques = useMemo(() => getCoveredTechniques(tactic), [tactic]);

  const ProgressLabel = useMemo(
    () => (
      <EuiText size="xs" color="success">
        <h5>{i18n.COVERED_MITRE_TECHNIQUES(coveredTechniques, tactic.techniques.length)}</h5>
      </EuiText>
    ),
    [tactic.techniques, coveredTechniques]
  );

  return (
    <TacticPanel
      data-test-subj="coverageOverviewTacticPanel"
      hasShadow={false}
      hasBorder={true}
      paddingSize="s"
    >
      <EuiToolTip content={tactic.name}>
        <TacticTitle aria-label={tactic.name} title={tactic.name} grow={false} size="xs">
          <h4>{tactic.name}</h4>
        </TacticTitle>
      </EuiToolTip>

      <EuiProgress
        color="success"
        value={coveredTechniques}
        label={ProgressLabel}
        max={tactic.techniques.length}
      />
      <EuiSpacer size="m" />
      <CoverageOverviewPanelMetadata
        enabledRules={tactic.enabledRules.length}
        disabledRules={tactic.disabledRules.length}
        availableRules={tactic.availableRules.length}
      />
    </TacticPanel>
  );
};

export const CoverageOverviewTacticPanel = memo(CoverageOverviewTacticPanelComponent);
