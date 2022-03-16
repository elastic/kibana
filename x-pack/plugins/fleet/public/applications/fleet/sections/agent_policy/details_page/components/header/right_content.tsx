/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedDate, FormattedMessage } from '@kbn/i18n-react';
import styled from 'styled-components';
import { useHistory } from 'react-router-dom';
import {
  EuiFlexGroup,
  EuiI18nNumber,
  EuiFlexItem,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiLink,
} from '@elastic/eui';

import { useLink } from '../../../../../hooks';
import type { AgentPolicy, GetAgentStatusResponse } from '../../../../../types';
import { AgentPolicyActionMenu, LinkedAgentCount } from '../../../components';
import { AddAgentHelpPopover } from '../../../../../components';

export interface HeaderRightContentProps {
  isLoading: boolean;
  policyId: string;
  agentPolicy?: AgentPolicy | null;
  agentStatus?: GetAgentStatusResponse['results'];
  addAgent: () => void;
  onCancelEnrollment?: () => void;
  isAddAgentHelpPopoverOpen: boolean;
  setIsAddAgentHelpPopoverOpen: (state: boolean) => void;
}

const Divider = styled.div`
  width: 0;
  height: 100%;
  border-left: ${(props) => props.theme.eui.euiBorderThin};
`;

export const HeaderRightContent: React.FunctionComponent<HeaderRightContentProps> = ({
  isLoading,
  policyId,
  agentPolicy,
  agentStatus,
  addAgent,
  onCancelEnrollment,
  isAddAgentHelpPopoverOpen,
  setIsAddAgentHelpPopoverOpen,
}) => {
  const { getPath } = useLink();
  const history = useHistory();

  if (!agentPolicy) {
    return null;
  }
  const addAgentLink = (
    <EuiLink onClick={addAgent}>
      <FormattedMessage id="xpack.fleet.policyDetails.addAgentButton" defaultMessage="Add agent" />
    </EuiLink>
  );

  return (
    <EuiFlexGroup justifyContent={'flexEnd'} direction="row">
      {[
        {
          label: i18n.translate('xpack.fleet.policyDetails.summary.revision', {
            defaultMessage: 'Revision',
          }),
          content: agentPolicy?.revision ?? 0,
        },
        { isDivider: true },
        {
          label: i18n.translate('xpack.fleet.policyDetails.summary.integrations', {
            defaultMessage: 'Integrations',
          }),
          content: (
            <EuiI18nNumber
              value={
                (agentPolicy &&
                  agentPolicy.package_policies &&
                  agentPolicy.package_policies.length) ||
                0
              }
            />
          ),
        },
        { isDivider: true },
        {
          label: i18n.translate('xpack.fleet.policyDetails.summary.usedBy', {
            defaultMessage: 'Agents',
          }),
          content:
            agentStatus && agentStatus!.total ? (
              <LinkedAgentCount
                count={agentStatus.total}
                agentPolicyId={(agentPolicy && agentPolicy.id) || ''}
                showAgentText
              />
            ) : agentPolicy?.is_managed ? (
              <LinkedAgentCount
                count={0}
                agentPolicyId={(agentPolicy && agentPolicy.id) || ''}
                showAgentText
              />
            ) : (
              <AddAgentHelpPopover
                button={addAgentLink}
                isOpen={isAddAgentHelpPopoverOpen}
                offset={15}
                closePopover={() => {
                  setIsAddAgentHelpPopoverOpen(false);
                }}
              />
            ),
        },
        { isDivider: true },
        {
          label: i18n.translate('xpack.fleet.policyDetails.summary.lastUpdated', {
            defaultMessage: 'Last updated on',
          }),
          content:
            (agentPolicy && (
              <FormattedDate
                value={agentPolicy?.updated_at}
                year="numeric"
                month="short"
                day="2-digit"
              />
            )) ||
            '',
        },
        { isDivider: true },
        {
          content: agentPolicy && (
            <AgentPolicyActionMenu
              agentPolicy={agentPolicy}
              fullButton={true}
              onCopySuccess={(newAgentPolicy: AgentPolicy) => {
                history.push(getPath('policy_details', { policyId: newAgentPolicy.id }));
              }}
              onCancelEnrollment={onCancelEnrollment}
            />
          ),
        },
      ].map((item, index) => (
        <EuiFlexItem grow={false} key={index}>
          {item.isDivider ?? false ? (
            <Divider />
          ) : item.label ? (
            <EuiDescriptionList compressed textStyle="reverse" style={{ textAlign: 'right' }}>
              <EuiDescriptionListTitle className="eui-textNoWrap">
                {item.label}
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription className="eui-textNoWrap">
                {item.content}
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          ) : (
            item.content
          )}
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
