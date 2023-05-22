/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import React from 'react';

import { euiStyled } from '@kbn/kibana-react-plugin/common';
import {
  SecurityCellActions,
  CellActionsMode,
  SecurityCellActionsTrigger,
} from '../../cell_actions';
import type { EnrichedFieldInfo } from '../types';

const ActionWrapper = euiStyled.div`
  margin-left: ${({ theme }) => theme.eui.euiSizeS};
`;

const OverviewPanel = euiStyled(EuiPanel)`
  &&& {
    background-color: ${({ theme }) => theme.eui.euiColorLightestShade};
    padding: ${({ theme }) => theme.eui.euiSizeS};
    height: 78px;
  }

  &:hover {
    .inlineActions {
      opacity: 1;
      width: auto;
      transform: translate(0);
    }
  }

  .inlineActions {
    opacity: 0;
    width: 0;
    transform: translate(6px);
    transition: transform 50ms ease-in-out;

    &.inlineActions-popoverOpen {
      opacity: 1;
      width: auto;
      transform: translate(0);
    }
   }
`;

interface OverviewCardProps {
  title: string;
}

export const OverviewCard: React.FC<OverviewCardProps> = ({ title, children }) => (
  <OverviewPanel borderRadius="none" hasShadow={false} hasBorder={false} paddingSize="s">
    <EuiText size="s">{title}</EuiText>
    <EuiSpacer size="s" />
    {children}
  </OverviewPanel>
);

OverviewCard.displayName = 'OverviewCard';

const ClampedContent = euiStyled.div`
  /* Clamp text content to 2 lines */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

ClampedContent.displayName = 'ClampedContent';

type OverviewCardWithActionsProps = OverviewCardProps & {
  contextId: string;
  enrichedFieldInfo: EnrichedFieldInfo;
  dataTestSubj?: string;
};

export const OverviewCardWithActions: React.FC<OverviewCardWithActionsProps> = ({
  title,
  children,
  contextId,
  dataTestSubj,
  enrichedFieldInfo,
}) => (
  <OverviewCard title={title}>
    <EuiFlexGroup alignItems="center" gutterSize="none">
      <ClampedContent data-test-subj={dataTestSubj}>{children}</ClampedContent>

      <ActionWrapper>
        <SecurityCellActions
          field={{
            name: enrichedFieldInfo.data.field,
            value: enrichedFieldInfo?.values,
            type: enrichedFieldInfo.data.type,
            aggregatable: enrichedFieldInfo.fieldFromBrowserField?.aggregatable,
          }}
          triggerId={SecurityCellActionsTrigger.DETAILS_FLYOUT}
          mode={CellActionsMode.INLINE}
          metadata={{ scopeId: contextId }}
          visibleCellActions={3}
        />
      </ActionWrapper>
    </EuiFlexGroup>
  </OverviewCard>
);

OverviewCardWithActions.displayName = 'OverviewCardWithActions';
