/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, memo, useMemo } from 'react';
import { EuiToolTip } from '@elastic/eui';
import * as i18n from './translations';
import { getTooltipContent, StyledBadge, StyledButton } from './helpers';
import { ModifiedTypes } from './use_pick_index_patterns';

interface Props {
  activePatterns?: string[];
  disabled: boolean;
  isModified: ModifiedTypes;
  isOnlyDetectionAlerts: boolean;
  isPopoverOpen: boolean;
  isTimelineSourcerer: boolean;
  loading: boolean;
  onClick: () => void;
  selectedPatterns: string[];
  signalIndexName: string | null;
}
export const TriggerComponent: FC<Props> = ({
  activePatterns,
  disabled,
  isModified,
  isOnlyDetectionAlerts,
  isPopoverOpen,
  isTimelineSourcerer,
  loading,
  onClick,
  selectedPatterns,
  signalIndexName,
}) => {
  const badge = useMemo(() => {
    switch (isModified) {
      case 'modified':
        return (
          <StyledBadge data-test-subj="sourcerer-modified-badge">
            {i18n.MODIFIED_BADGE_TITLE}
          </StyledBadge>
        );
      case 'alerts':
        return (
          <StyledBadge data-test-subj="sourcerer-alerts-badge">
            {i18n.ALERTS_BADGE_TITLE}
          </StyledBadge>
        );
      case 'deprecated':
        return (
          <StyledBadge color="warning" data-test-subj="sourcerer-deprecated-badge">
            {i18n.DEPRECATED_BADGE_TITLE}
          </StyledBadge>
        );
      case 'missingPatterns':
        return (
          <StyledBadge color="warning" data-test-subj="sourcerer-missingPatterns-badge">
            {i18n.DEPRECATED_BADGE_TITLE}
          </StyledBadge>
        );
      case '':
      default:
        return null;
    }
  }, [isModified]);

  const trigger = useMemo(
    () => (
      <StyledButton
        aria-label={i18n.DATA_VIEW}
        data-test-subj={isTimelineSourcerer ? 'timeline-sourcerer-trigger' : 'sourcerer-trigger'}
        flush="left"
        iconSide="right"
        iconType="arrowDown"
        disabled={disabled}
        isLoading={loading}
        onClick={onClick}
        title={i18n.DATA_VIEW}
      >
        {i18n.DATA_VIEW}
        {!disabled && badge}
      </StyledButton>
    ),
    [disabled, badge, isTimelineSourcerer, loading, onClick]
  );

  const tooltipContent = useMemo(
    () =>
      disabled
        ? i18n.DISABLED_SOURCERER
        : getTooltipContent({
            isOnlyDetectionAlerts,
            isPopoverOpen,
            // if activePatterns, use because we are in the temporary sourcerer state
            selectedPatterns: activePatterns ?? selectedPatterns,
            signalIndexName,
          }),
    [
      activePatterns,
      disabled,
      isOnlyDetectionAlerts,
      isPopoverOpen,
      selectedPatterns,
      signalIndexName,
    ]
  );

  return tooltipContent ? (
    <EuiToolTip position="top" content={tooltipContent} data-test-subj="sourcerer-tooltip">
      {trigger}
    </EuiToolTip>
  ) : (
    trigger
  );
};

export const Trigger = memo(TriggerComponent);
