/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { AgentTypeVendorLogo } from '../../../../../common/components/endpoint/agents/agent_type_vendor_logo';
import { getAgentTypeName } from '../../../../../common/translations';
import type { ResponseActionAgentType } from '../../../../../../common/endpoint/service/response_actions/constants';
import type { Platform } from './platforms';
import { PlatformIcon } from './platforms';

const INTEGRATION_SECTION_LABEL = i18n.translate(
  'xpack.securitySolution.headerAgentInfo.integrationSectionLabel',
  { defaultMessage: 'Integration' }
);

interface HeaderAgentInfoProps {
  platform: Platform;
  hostName: string;
  lastCheckin: string;
  children: React.ReactNode;
  agentType?: ResponseActionAgentType;
}

export const HeaderAgentInfo = memo<HeaderAgentInfoProps>(
  ({ platform, hostName, lastCheckin, agentType, children }) => {
    const { euiTheme } = useEuiTheme();

    return (
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" justifyContent="center">
            <PlatformIcon data-test-subj="responderHeaderHostPlatformIcon" platform={platform} />
          </EuiFlexGroup>
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

        {agentType && (
          <EuiFlexItem css={{ paddingLeft: euiTheme.size.l }}>
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFlexItem>
                <EuiText color="subdued" size="s" data-test-subj="responderHeaderIntegrationLabel">
                  {INTEGRATION_SECTION_LABEL}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFlexGroup responsive={false} wrap={false} gutterSize="xs" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <AgentTypeVendorLogo agentType={agentType} />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s" data-test-subj="responderHeaderIntegrationName">
                      {getAgentTypeName(agentType)}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }
);

HeaderAgentInfo.displayName = 'HeaderAgentInfo';
