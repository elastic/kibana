/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiIconTip,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiTitle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { useLink } from '../../../../../hooks';
import type { AgentPolicy } from '../../../../../types';
import { Loading } from '../../../../../components';

interface HeaderLeftContentProps {
  isLoading: boolean;
  policyId: string;
  agentPolicy?: AgentPolicy | null;
}

export const HeaderLeftContent: React.FunctionComponent<HeaderLeftContentProps> = ({
  isLoading,
  policyId,
  agentPolicy,
}) => {
  const { getHref } = useLink();

  return (
    <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
      <EuiFlexItem>
        <EuiButtonEmpty iconType="arrowLeft" href={getHref('policies_list')} flush="left" size="xs">
          <FormattedMessage
            id="xpack.fleet.policyDetails.viewAgentListTitle"
            defaultMessage="View all agent policies"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem>
        {isLoading ? (
          <Loading />
        ) : (
          <EuiFlexGroup alignItems="center" wrap responsive={false} gutterSize="s">
            <EuiFlexItem>
              <EuiTitle>
                <h1>
                  {(agentPolicy && agentPolicy.name) || (
                    <FormattedMessage
                      id="xpack.fleet.policyDetails.policyDetailsTitle"
                      defaultMessage="Policy '{id}'"
                      values={{ id: policyId }}
                    />
                  )}
                </h1>
              </EuiTitle>
            </EuiFlexItem>
            {agentPolicy?.is_managed && (
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  title="Hosted agent policy"
                  content={i18n.translate(
                    'xpack.fleet.policyDetails.policyDetailsHostedPolicyTooltip',
                    {
                      defaultMessage:
                        'This policy is managed outside of Fleet. Most actions related to this policy are unavailable.',
                    }
                  )}
                  type="lock"
                  size="l"
                  color="subdued"
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        )}
      </EuiFlexItem>

      {agentPolicy && agentPolicy.description ? (
        <EuiFlexItem>
          <EuiSpacer size="s" />
          <EuiText color="subdued" size="s" className="eui-textBreakWord">
            {agentPolicy.description}
          </EuiText>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};
