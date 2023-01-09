/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiToolTip } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { IlmPhaseCounts } from '../../../ilm_phase_counts';
import * as i18n from '../translations';
import type { IlmExplainPhaseCounts } from '../../../../types';

const IlmPhaseCountsContainer = styled.div`
  margin-left: ${({ theme }) => theme.eui.euiSizeS};
`;

interface Props {
  ilmExplainPhaseCounts: IlmExplainPhaseCounts;
  pattern: string;
}

const PatternLabelComponent: React.FC<Props> = ({ ilmExplainPhaseCounts, pattern }) => (
  <EuiFlexGroup alignItems="center" gutterSize="none" justifyContent="spaceBetween">
    <EuiFlexItem grow={false}>
      <EuiToolTip content={i18n.PATTERN_OR_INDEX_TOOLTIP}>
        <EuiTitle size="s">
          <h4>{pattern}</h4>
        </EuiTitle>
      </EuiToolTip>
    </EuiFlexItem>

    <EuiFlexItem grow={false}>
      <IlmPhaseCountsContainer>
        <IlmPhaseCounts ilmExplainPhaseCounts={ilmExplainPhaseCounts} />
      </IlmPhaseCountsContainer>
    </EuiFlexItem>
  </EuiFlexGroup>
);

PatternLabelComponent.displayName = 'PatternLabelComponent';

export const PatternLabel = React.memo(PatternLabelComponent);
