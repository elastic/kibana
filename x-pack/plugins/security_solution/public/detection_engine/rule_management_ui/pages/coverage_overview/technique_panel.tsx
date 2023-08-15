/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import { css } from '@emotion/css';
import React, { memo, useCallback, useMemo } from 'react';
import type { CoverageOverviewMitreTechnique } from '../../../rule_management/model/coverage_overview/mitre_technique';
import { coverageOverviewPanelWidth } from './constants';
import { getCardBackgroundColor } from './helpers';
import { CoverageOverviewPanelRuleStats } from './shared_components/panel_rule_stats';
import * as i18n from './translations';

export interface CoverageOverviewMitreTechniquePanelProps {
  technique: CoverageOverviewMitreTechnique;
  coveredSubtechniques: number;
  setIsPopoverOpen: (isOpen: boolean) => void;
  isPopoverOpen: boolean;
  isExpanded: boolean;
}

const CoverageOverviewMitreTechniquePanelComponent = ({
  technique,
  coveredSubtechniques,
  setIsPopoverOpen,
  isPopoverOpen,
  isExpanded,
}: CoverageOverviewMitreTechniquePanelProps) => {
  const techniqueBackgroundColor = useMemo(
    () => getCardBackgroundColor(technique.enabledRules.length),
    [technique.enabledRules.length]
  );

  const handlePanelOnClick = useCallback(
    () => setIsPopoverOpen(!isPopoverOpen),
    [isPopoverOpen, setIsPopoverOpen]
  );

  const SubtechniqueInfo = useMemo(
    () => (
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem
          className={css`
            white-space: nowrap;
          `}
          grow={false}
        >
          <EuiText size="xs">{i18n.SUBTECHNIQUES}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs">{`${coveredSubtechniques}/${technique.subtechniques.length}`}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [technique.subtechniques, coveredSubtechniques]
  );

  return (
    <EuiPanel
      data-test-subj="coverageOverviewTechniquePanel"
      className={css`
        background: ${techniqueBackgroundColor};
        width: ${coverageOverviewPanelWidth}px;
      `}
      hasShadow={false}
      hasBorder={!techniqueBackgroundColor}
      paddingSize="s"
      onClick={handlePanelOnClick}
      element="div"
    >
      <EuiFlexGroup css={{ height: '100%' }} direction="column" justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiText size="xs">
            <h4>{technique.name}</h4>
          </EuiText>
          {SubtechniqueInfo}
        </EuiFlexItem>
        {isExpanded && (
          <EuiFlexItem grow={false}>
            <CoverageOverviewPanelRuleStats
              enabledRules={technique.enabledRules.length}
              disabledRules={technique.disabledRules.length}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export const CoverageOverviewMitreTechniquePanel = memo(
  CoverageOverviewMitreTechniquePanelComponent
);
