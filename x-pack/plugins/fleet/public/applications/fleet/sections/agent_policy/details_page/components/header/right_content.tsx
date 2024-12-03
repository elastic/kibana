/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
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
  EuiToolTip,
  EuiIconTip,
} from '@elastic/eui';

import { useAuthz, useLink } from '../../../../../hooks';
import type { AgentPolicy } from '../../../../../types';
import { AgentPolicyActionMenu, LinkedAgentCount } from '../../../components';
import { AddAgentHelpPopover } from '../../../../../components';
import { FLEET_SERVER_PACKAGE } from '../../../../../../../../common/constants';
import { getRootIntegrations } from '../../../../../../../../common/services';

export interface HeaderRightContentProps {
  isLoading: boolean;
  agentPolicy?: AgentPolicy | null;
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
  agentPolicy,
  addAgent,
  onCancelEnrollment,
  isAddAgentHelpPopoverOpen,
  setIsAddAgentHelpPopoverOpen,
}) => {
  const authz = useAuthz();
  const { getPath } = useLink();
  const history = useHistory();

  const isFleetServerPolicy = useMemo(
    () =>
      agentPolicy?.package_policies?.some(
        (packagePolicy) => packagePolicy.package?.name === FLEET_SERVER_PACKAGE
      ),
    [agentPolicy]
  );

  if (!agentPolicy) {
    return null;
  }

  const addFleetServerLink = (
    <EuiLink onClick={addAgent} data-test-subj="addAgentLink">
      <FormattedMessage
        id="xpack.fleet.policyDetails.addFleetServerButton"
        defaultMessage="Add Fleet Server"
      />
    </EuiLink>
  );

  const addAgentLink = (
    <EuiLink onClick={addAgent} data-test-subj="addAgentLink">
      <FormattedMessage id="xpack.fleet.policyDetails.addAgentButton" defaultMessage="Add agent" />
    </EuiLink>
  );

  return (
    <EuiFlexGroup justifyContent={'flexEnd'} direction="row">
      {isLoading || !agentPolicy
        ? null
        : [
            {
              label: i18n.translate('xpack.fleet.policyDetails.summary.revision', {
                defaultMessage: 'Revision',
              }),
              content: agentPolicy.revision ?? 0,
            },
            { isDivider: true },
            {
              label: i18n.translate('xpack.fleet.policyDetails.summary.integrations', {
                defaultMessage: 'Integrations',
              }),
              content: (
                <EuiI18nNumber
                  value={(agentPolicy.package_policies && agentPolicy.package_policies.length) || 0}
                />
              ),
            },
            { isDivider: true },
            ...(authz.fleet.readAgents && !agentPolicy?.supports_agentless
              ? [
                  {
                    label: i18n.translate('xpack.fleet.policyDetails.summary.usedBy', {
                      defaultMessage: 'Agents',
                    }),
                    content:
                      !agentPolicy.agents && isFleetServerPolicy && authz.fleet.addFleetServers ? (
                        <AddAgentHelpPopover
                          button={addFleetServerLink}
                          isOpen={isAddAgentHelpPopoverOpen}
                          offset={15}
                          closePopover={() => {
                            setIsAddAgentHelpPopoverOpen(false);
                          }}
                        />
                      ) : !agentPolicy.agents && !isFleetServerPolicy && authz.fleet.addAgents ? (
                        <AddAgentHelpPopover
                          button={addAgentLink}
                          isOpen={isAddAgentHelpPopoverOpen}
                          offset={15}
                          closePopover={() => {
                            setIsAddAgentHelpPopoverOpen(false);
                          }}
                        />
                      ) : (
                        <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center">
                          <EuiFlexItem grow={false}>
                            <EuiToolTip
                              content={
                                <EuiFlexGroup direction="column" gutterSize="xs">
                                  <EuiFlexItem>
                                    <FormattedMessage
                                      id="xpack.fleet.policyDetails.summary.usedByUnprivilegedTooltip"
                                      defaultMessage="{count, plural, one {# unprivileged agent} other {# unprivileged agents}}"
                                      values={{ count: agentPolicy.unprivileged_agents || 0 }}
                                    />
                                  </EuiFlexItem>
                                  <EuiFlexItem>
                                    <FormattedMessage
                                      id="xpack.fleet.policyDetails.summary.usedByPrivilegedTooltip"
                                      defaultMessage="{count, plural, one {# privileged agent} other {# privileged agents}}"
                                      values={{
                                        count:
                                          (agentPolicy.agents || 0) -
                                          (agentPolicy.unprivileged_agents || 0),
                                      }}
                                    />
                                  </EuiFlexItem>
                                </EuiFlexGroup>
                              }
                            >
                              <LinkedAgentCount
                                count={agentPolicy.agents || 0}
                                agentPolicyId={agentPolicy.id}
                                showAgentText={true}
                              />
                            </EuiToolTip>
                          </EuiFlexItem>
                          {getRootIntegrations(agentPolicy.package_policies || []).length > 0 &&
                            (agentPolicy.unprivileged_agents || 0) > 0 && (
                              <EuiFlexItem grow={false}>
                                <EuiIconTip
                                  type="warning"
                                  color="warning"
                                  content={
                                    <FormattedMessage
                                      id="xpack.fleet.policyDetails.summary.containsUnprivilegedAgentsWarning"
                                      defaultMessage="This agent policy contains integrations that require Elastic Agents to have root privileges. Some enrolled agents are running in unprivileged mode."
                                    />
                                  }
                                />
                              </EuiFlexItem>
                            )}
                        </EuiFlexGroup>
                      ),
                  },
                  { isDivider: true },
                ]
              : []),
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
