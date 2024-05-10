/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiPopover, EuiPopoverTitle, EuiText } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import * as i18n from './translations';
import { RiskScoreDocLink } from '../../entity_analytics/components/risk_score_onboarding/risk_score_doc_link';
import type { RiskScoreEntity } from '../../../common/entity_analytics/risk_engine';

export const RiskScoreInfoTooltip: React.FC<{
  toolTipContent: React.ReactNode;
  toolTipTitle?: React.ReactNode;
  width?: number;
}> = ({ toolTipContent, toolTipTitle, width = 270 }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onClick = useCallback(() => {
    setIsPopoverOpen(!isPopoverOpen);
  }, [isPopoverOpen, setIsPopoverOpen]);

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, [setIsPopoverOpen]);

  return (
    <EuiPopover
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      anchorPosition="leftCenter"
      button={
        <EuiButtonIcon
          color="text"
          size="xs"
          iconSize="m"
          iconType="iInCircle"
          aria-label={i18n.INFORMATION_ARIA_LABEL}
          onClick={onClick}
        />
      }
    >
      {toolTipTitle && <EuiPopoverTitle>{toolTipTitle}</EuiPopoverTitle>}
      <EuiText size="s" style={{ width: `${width}px` }}>
        {toolTipContent}
      </EuiText>
    </EuiPopover>
  );
};

export const RiskScoreDocTooltip = ({ riskScoreEntity }: { riskScoreEntity: RiskScoreEntity }) => (
  <RiskScoreInfoTooltip
    toolTipContent={<RiskScoreDocLink riskScoreEntity={riskScoreEntity} />}
    width={200} // Magic number to match the width of the doc link
  />
);
