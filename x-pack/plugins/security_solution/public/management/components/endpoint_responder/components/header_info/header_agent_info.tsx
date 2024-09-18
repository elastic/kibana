/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import { AgentTypeIntegration } from '../../../../../common/components/endpoint/agents/agent_type_integration';
import { useTestIdGenerator } from '../../../../hooks/use_test_id_generator';
import type { ResponseActionAgentType } from '../../../../../../common/endpoint/service/response_actions/constants';
import type { Platform } from './platforms';
import { PlatformIcon } from './platforms';

interface HeaderAgentInfoProps {
  platform: Platform;
  hostName: string;
  lastCheckin: string;
  children: React.ReactNode;
  agentType?: ResponseActionAgentType;
  'data-test-subj'?: string;
}

export const HeaderAgentInfo = memo<HeaderAgentInfoProps>(
  ({ platform, hostName, lastCheckin, agentType, 'data-test-subj': dataTestSubj, children }) => {
    const { euiTheme } = useEuiTheme();
    const testId = useTestIdGenerator(dataTestSubj);

    return (
      <EuiFlexGroup
        gutterSize="s"
        responsive={false}
        alignItems="center"
        data-test-subj={testId('agentInfo')}
      >
        <EuiFlexItem grow={false}>
          <PlatformIcon data-test-subj={testId('platformIcon')} platform={platform} />
        </EuiFlexItem>
        <EuiFlexItem grow={false} className="eui-textTruncate">
          <EuiFlexGroup direction="column" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="xs">
                <EuiFlexItem grow={false} className="eui-textTruncate">
                  <EuiToolTip content={hostName} anchorClassName="eui-textTruncate">
                    <EuiText
                      size="s"
                      data-test-subj={testId('hostName')}
                      className="eui-textTruncate"
                    >
                      <h6 className="eui-textTruncate">{hostName}</h6>
                    </EuiText>
                  </EuiToolTip>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>{children}</EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiText color="subdued" size="s" data-test-subj={testId('lastSeen')}>
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
          <EuiFlexItem grow={false} css={{ paddingLeft: euiTheme.size.l }}>
            <AgentTypeIntegration agentType={agentType} data-test-subj={testId('integration')} />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }
);

HeaderAgentInfo.displayName = 'HeaderAgentInfo';
