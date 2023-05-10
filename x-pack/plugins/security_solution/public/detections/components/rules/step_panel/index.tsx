/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiPanel, EuiProgress } from '@elastic/eui';
import React, { memo } from 'react';
import styled from 'styled-components';
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import type { Rule } from '../../../../detection_engine/rule_management/logic';
import { CopyRuleConfigurationsPopover } from '../../../../detection_engine/rule_creation_ui/pages/copy_configs';

import { HeaderSection } from '../../../../common/components/header_section';

interface StepPanelProps {
  children: React.ReactNode;
  loading: boolean;
  title?: string;
  ruleId?: string;
  ruleType?: Type;
  copyConfigurations?: (rule: Rule) => void;
}

const MyPanel = styled(EuiPanel)`
  position: relative;
`;

MyPanel.displayName = 'MyPanel';

const StepPanelComponent: React.FC<StepPanelProps> = ({
  children,
  loading,
  title,
  ruleId,
  ruleType,
  copyConfigurations,
}) => (
  <MyPanel hasBorder>
    {loading && (
      <EuiProgress
        size="xs"
        color="accent"
        position="absolute"
        data-test-subj="stepPanelProgress"
      />
    )}
    {title && copyConfigurations && (
      <EuiFlexGroup direction="row" justifyContent="spaceBetween">
        <HeaderSection title={title} />
        <CopyRuleConfigurationsPopover
          copyConfigurations={copyConfigurations}
          ruleType={ruleType}
          ruleId={ruleId}
        />
      </EuiFlexGroup>
    )}
    {children}
  </MyPanel>
);

export const StepPanel = memo(StepPanelComponent);
