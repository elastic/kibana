/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiFlyoutFooter } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import type { FlowTargetSourceDest } from '../../../common/search_strategy';
import { NetworkDetailsLink } from '../../common/components/links';

export interface PanelFooterProps {
  expandedNetwork: { ip: string; flowTarget: FlowTargetSourceDest };
}

/**
 *
 */
export const PanelFooter: FC<PanelFooterProps> = memo(({ expandedNetwork }: PanelFooterProps) => {
  const { flowTarget, ip } = expandedNetwork;
  return (
    <EuiFlyoutFooter
      css={css`
        padding: ${euiThemeVars.euiPanelPaddingModifiers.paddingMedium} !important;
      `}
    >
      <EuiFlexGroup responsive={false} justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <NetworkDetailsLink ip={ip} flowTarget={flowTarget} isButton />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
});

PanelFooter.displayName = 'PanelFooter';
