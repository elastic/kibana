/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import React, { memo, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import type { CoverageOverviewMitreTechnique } from '../../../rule_management/model/coverage_overview/mitre_technique';
import { getTechniqueBackgroundColor } from './helpers';
import { CoverageOverviewPanelMetadata } from './shared_components';
import * as i18n from './translations';

export interface CoverageOverviewMitreTechniquePanelProps {
  technique: CoverageOverviewMitreTechnique;
  coveredSubtechniques: number;
  setIsPopoverOpen: (isOpen: boolean) => void;
  isPopoverOpen: boolean;
  isExpanded: boolean;
}

const TechniquePanel = styled(EuiPanel)<{ $techniqueBackgroundColor?: string }>`
  background: ${({ $techniqueBackgroundColor }) => `${$techniqueBackgroundColor}`};
`;

const CoverageOverviewMitreTechniquePanelComponent = ({
  technique,
  coveredSubtechniques,
  setIsPopoverOpen,
  isPopoverOpen,
  isExpanded,
}: CoverageOverviewMitreTechniquePanelProps) => {
  const techniqueBackgroundColor = useMemo(
    () => getTechniqueBackgroundColor(technique),
    [technique]
  );

  const handlePanelOnClick = useCallback(
    () => setIsPopoverOpen(!isPopoverOpen),
    [isPopoverOpen, setIsPopoverOpen]
  );

  const SubtechniqueInfo = useMemo(
    () => (
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
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
    <TechniquePanel
      data-test-subj="coverageOverviewTechniquePanel"
      $techniqueBackgroundColor={techniqueBackgroundColor}
      hasShadow={false}
      hasBorder={!techniqueBackgroundColor}
      paddingSize="s"
      onClick={handlePanelOnClick}
      css={{ width: 160 }}
    >
      <EuiFlexGroup css={{ height: '100%' }} direction="column" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            <h4>{technique.name}</h4>
          </EuiText>
          {SubtechniqueInfo}
        </EuiFlexItem>
        {isExpanded && (
          <EuiFlexItem grow={false}>
            <CoverageOverviewPanelMetadata
              enabledRules={technique.enabledRules.length}
              disabledRules={technique.disabledRules.length}
              availableRules={technique.availableRules.length}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </TechniquePanel>
  );
};

export const CoverageOverviewMitreTechniquePanel = memo(
  CoverageOverviewMitreTechniquePanelComponent
);
