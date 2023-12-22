/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiToolTip } from '@elastic/eui';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import { euiStyled } from '@kbn/react-kibana-context-styled';
import type { Platform } from './platforms';
import { PlatformIcon } from './platforms';

const IconContainer = euiStyled.div`
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

interface HeaderAgentInfoProps {
  platform: Platform;
  hostName: string;
  lastCheckin: string;
  children: React.ReactNode;
}

export const HeaderAgentInfo = memo<HeaderAgentInfoProps>(
  ({ platform, hostName, lastCheckin, children }) => {
    return (
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={false}>
          <IconContainer>
            <PlatformIcon data-test-subj="responderHeaderHostPlatformIcon" platform={platform} />
          </IconContainer>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="xs">
                <EuiFlexItem grow={false} className="eui-textTruncate">
                  <EuiToolTip content={hostName} anchorClassName="eui-textTruncate">
                    <EuiText size="s" data-test-subj="responderHeaderHostName">
                      <h6 className="eui-textTruncate">{hostName}</h6>
                    </EuiText>
                  </EuiToolTip>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>{children}</EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiSpacer size="xs" />
              <EuiText color="subdued" size="s" data-test-subj="responderHeaderLastSeen">
                <FormattedMessage
                  id="xpack.securitySolution.responder.header.lastSeen"
                  defaultMessage="Last seen {date}"
                  values={{
                    date: <FormattedRelative value={lastCheckin} />,
                  }}
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

HeaderAgentInfo.displayName = 'HeaderAgentInfo';
