/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiHealth, transparentize } from '@elastic/eui';

import styled, { css } from 'styled-components';
import { euiLightVars } from '@kbn/ui-theme';

import { WithHoverActions } from '../../with_hover_actions';
import { RiskSeverity } from '../../../../../common/search_strategy';

export const RISK_SEVERITY_COLOUR: { [k in RiskSeverity]: string } = {
  [RiskSeverity.unknown]: euiLightVars.euiColorMediumShade,
  [RiskSeverity.low]: euiLightVars.euiColorVis0,
  [RiskSeverity.moderate]: euiLightVars.euiColorWarning,
  [RiskSeverity.high]: euiLightVars.euiColorVis9_behindText,
  [RiskSeverity.critical]: euiLightVars.euiColorDanger,
};

const RiskBadge = styled.div<{ $severity: RiskSeverity; $hideBackgroundColor: boolean }>`
  ${({ theme, $severity, $hideBackgroundColor }) => css`
    width: fit-content;
    padding-right: ${theme.eui.paddingSizes.s};
    padding-left: ${theme.eui.paddingSizes.xs};

    ${($severity === 'Critical' || $severity === 'High') &&
    !$hideBackgroundColor &&
    css`
      background-color: ${transparentize(theme.eui.euiColorDanger, 0.2)};
      border-radius: 999px; // pill shaped
    `};
  `}
`;
const TooltipContainer = styled.div`
  padding: ${({ theme }) => theme.eui.paddingSizes.s};
`;
export const RiskScore: React.FC<{
  severity: RiskSeverity;
  hideBackgroundColor?: boolean;
  toolTipContent?: JSX.Element;
}> = ({ severity, hideBackgroundColor = false, toolTipContent }) => {
  const badge = (
    <RiskBadge
      color={euiLightVars.euiColorDanger}
      $severity={severity}
      $hideBackgroundColor={hideBackgroundColor}
      data-test-subj="risk-score"
    >
      <EuiHealth className="eui-alignMiddle" color={RISK_SEVERITY_COLOUR[severity]}>
        {severity}
      </EuiHealth>
    </RiskBadge>
  );

  if (toolTipContent != null) {
    return (
      <WithHoverActions
        hoverContent={<TooltipContainer>{toolTipContent}</TooltipContainer>}
        render={() => badge}
      />
    );
  }
  return badge;
};
