/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { EuiHealth, transparentize, EuiPopover } from '@elastic/eui';

import styled, { css } from 'styled-components';
import { euiLightVars } from '@kbn/ui-theme';
import { HostRiskSeverity } from '../../../../common/search_strategy';

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

export const HostRiskScore: React.FC<{
  severity: HostRiskSeverity;
  hideBackgroundColor?: boolean;
  toolTipContent?: React.ReactNode;
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
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  if (toolTipContent != null) {
    return (
      <EuiPopover
        anchorPosition="downCenter"
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
        onBlur={() => setIsPopoverOpen(false)}
        onFocus={() => setIsPopoverOpen(true)}
        onMouseOut={() => setIsPopoverOpen(false)}
        onMouseOver={() => setIsPopoverOpen(true)}
        button={
          <button
            data-test-subj="host-risk-score-button"
            onBlur={() => setIsPopoverOpen(false)}
            onFocus={() => setIsPopoverOpen(true)}
            onMouseOut={() => setIsPopoverOpen(false)}
            onMouseOver={() => setIsPopoverOpen(true)}
            type={'button'}
          >
            {badge}
          </button>
        }
      >
        {toolTipContent}
      </EuiPopover>
    );
  }
  return badge;
};
