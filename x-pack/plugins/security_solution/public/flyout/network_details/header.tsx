/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { css } from '@emotion/react';
import { EuiTitle } from '@elastic/eui';
import type { EuiFlyoutHeader } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { FlowTargetSourceDest } from '../../../common/search_strategy';
import { FlyoutHeader } from '../shared/components/flyout_header';

const NETWORK_DETAILS = i18n.translate(
  'xpack.securitySolution.timeline.sidePanel.networkDetails.title',
  {
    defaultMessage: 'Network details',
  }
);

export interface PanelHeaderProps extends React.ComponentProps<typeof EuiFlyoutHeader> {
  expandedNetwork: { ip: string; flowTarget: FlowTargetSourceDest };
}

/**
 *
 */
export const PanelHeader: FC<PanelHeaderProps> = memo(
  ({ expandedNetwork, ...flyoutHeaderProps }: PanelHeaderProps) => {
    const { ip } = expandedNetwork;

    return (
      <FlyoutHeader {...flyoutHeaderProps}>
        <EuiTitle size="s">
          <h4
            css={css`
              word-break: break-all;
              word-wrap: break-word;
              white-space: pre-wrap;
            `}
          >
            {`${NETWORK_DETAILS}: ${ip}`}
          </h4>
        </EuiTitle>
      </FlyoutHeader>
    );
  }
);

PanelHeader.displayName = 'PanelHeader';
