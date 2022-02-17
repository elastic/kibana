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
import { HostRiskSeverity } from '../../../../common/search_strategy';
import { WithHoverActions } from '../../../common/components/with_hover_actions';

export const HOST_RISK_SEVERITY_COLOUR: { [k in HostRiskSeverity]: string } = {
  [HostRiskSeverity.unknown]: euiLightVars.euiColorMediumShade,
  [HostRiskSeverity.low]: euiLightVars.euiColorVis0,
  [HostRiskSeverity.moderate]: euiLightVars.euiColorWarning,
  [HostRiskSeverity.high]: euiLightVars.euiColorVis9_behindText,
  [HostRiskSeverity.critical]: euiLightVars.euiColorDanger,
};

const HostRiskBadge = styled.div<{ $severity: HostRiskSeverity; $hideBackgroundColor: boolean }>`
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
export const HostRiskScore: React.FC<{
  severity: HostRiskSeverity;
  hideBackgroundColor?: boolean;
  toolTipContent?: JSX.Element;
}> = ({ severity, hideBackgroundColor = false, toolTipContent }) => {
  const badge = (
    <HostRiskBadge
      color={euiLightVars.euiColorDanger}
      $severity={severity}
      $hideBackgroundColor={hideBackgroundColor}
      data-test-subj="host-risk-score"
    >
      <EuiHealth className="eui-alignMiddle" color={HOST_RISK_SEVERITY_COLOUR[severity]}>
        {severity}
      </EuiHealth>
    </HostRiskBadge>
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
