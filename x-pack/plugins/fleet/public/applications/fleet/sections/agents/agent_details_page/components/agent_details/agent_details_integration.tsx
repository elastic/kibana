/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiAccordion,
  EuiTitle,
  EuiPanel,
  EuiSpacer,
  EuiBadge,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import styled from 'styled-components';

import type { EuiAccordionProps } from '@elastic/eui/src/components/accordion';

import type { Agent, AgentPolicy, PackagePolicy } from '../../../../../types';
import { useLink, useUIExtension } from '../../../../../hooks';
import { ExtensionWrapper, PackageIcon } from '../../../../../components';

import { AgentDetailsIntegrationInputs } from './agent_details_integration_inputs';
import { getInputUnitsByPackage } from './input_status_utils';

const StyledEuiAccordion = styled(EuiAccordion)`
  .euiAccordion__button {
    width: 90%;
  }

  .euiAccordion__triggerWrapper {
    padding-left: ${(props) => props.theme.eui.euiSizeM};
  }

  &.euiAccordion-isOpen {
    .euiAccordion__childWrapper {
      padding: ${(props) => props.theme.eui.euiSizeM};
      padding-top: 0px;
    }
  }

  .ingest-integration-title-button {
    padding: ${(props) => props.theme.eui.euiSizeS};
  }

  .euiTableRow:last-child .euiTableRowCell {
    border-bottom: none;
  }

  .euiIEFlexWrapFix {
    min-width: 0;
  }

  .euiAccordion__buttonContent {
    width: 100%;
  }
`;

const CollapsablePanel: React.FC<{
  children: React.ReactNode;
  id: string;
  title: React.ReactNode;
  'data-test-subj'?: string;
}> = ({ id, title, children, 'data-test-subj': dataTestSubj }) => {
  const arrowProps = useMemo<EuiAccordionProps['arrowProps']>(() => {
    if (dataTestSubj) {
      return {
        'data-test-subj': `${dataTestSubj}-openCloseToggle`,
      };
    }
    return undefined;
  }, [dataTestSubj]);

  return (
    <EuiPanel paddingSize="none">
      <StyledEuiAccordion
        id={id}
        arrowDisplay="left"
        buttonClassName="ingest-integration-title-button"
        buttonContent={title}
        arrowProps={arrowProps}
        data-test-subj={dataTestSubj}
      >
        {children}
      </StyledEuiAccordion>
    </EuiPanel>
  );
};

export const AgentDetailsIntegration: React.FunctionComponent<{
  agent: Agent;
  agentPolicy: AgentPolicy;
  packagePolicy: PackagePolicy;
  'data-test-subj'?: string;
}> = memo(({ agent, agentPolicy, packagePolicy, 'data-test-subj': dataTestSubj }) => {
  const { getHref } = useLink();
  const theme = useEuiTheme();

  const [isAttentionBadgeNeededForPolicyResponse, setIsAttentionBadgeNeededForPolicyResponse] =
    useState(false);

  const policyResponseExtensionView = useUIExtension(
    packagePolicy.package?.name ?? '',
    'package-policy-response'
  );

  const policyResponseExtensionViewWrapper = useMemo(() => {
    return (
      policyResponseExtensionView && (
        <ExtensionWrapper>
          <policyResponseExtensionView.Component
            agent={agent}
            onShowNeedsAttentionBadge={setIsAttentionBadgeNeededForPolicyResponse}
          />
        </ExtensionWrapper>
      )
    );
  }, [agent, policyResponseExtensionView]);

  const packageErrors = useMemo(() => {
    if (!agent.components) {
      return [];
    }
    return getInputUnitsByPackage(agent.components, packagePolicy).filter(
      (u) => u.status === 'DEGRADED' || u.status === 'FAILED'
    );
  }, [agent.components, packagePolicy]);

  const showNeedsAttentionBadge = isAttentionBadgeNeededForPolicyResponse || !!packageErrors.length;

  const genericErrorsListExtensionView = useUIExtension(
    packagePolicy.package?.name ?? '',
    'package-generic-errors-list'
  );

  const genericErrorsListExtensionViewWrapper = useMemo(() => {
    return (
      genericErrorsListExtensionView && (
        <ExtensionWrapper>
          <genericErrorsListExtensionView.Component packageErrors={packageErrors} />
        </ExtensionWrapper>
      )
    );
  }, [packageErrors, genericErrorsListExtensionView]);

  return (
    <CollapsablePanel
      id={packagePolicy.id}
      data-test-subj={dataTestSubj}
      title={
        <EuiTitle size="xs">
          <h3>
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                {packagePolicy.package ? (
                  <PackageIcon
                    packageName={packagePolicy.package.name}
                    version={packagePolicy.package.version}
                    size="l"
                    tryApi={true}
                  />
                ) : (
                  <PackageIcon size="l" packageName="default" version="0" />
                )}
              </EuiFlexItem>
              <EuiFlexItem className="eui-textTruncate">
                <EuiLink
                  className="eui-textTruncate"
                  data-test-subj="agentPolicyDetailsLink"
                  href={getHref('edit_integration', {
                    policyId: agentPolicy.id,
                    packagePolicyId: packagePolicy.id,
                  })}
                >
                  {packagePolicy.name}
                </EuiLink>
              </EuiFlexItem>
              {showNeedsAttentionBadge && (
                <EuiFlexItem grow={false}>
                  <EuiBadge
                    color={theme.euiTheme.colors.danger}
                    iconType="warning"
                    iconSide="left"
                    data-test-subj={dataTestSubj ? `${dataTestSubj}-needsAttention` : undefined}
                  >
                    <FormattedMessage
                      id="xpack.fleet.agentDetailsIntegrations.needsAttention.label"
                      defaultMessage="Needs attention"
                    />
                  </EuiBadge>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </h3>
        </EuiTitle>
      }
    >
      <AgentDetailsIntegrationInputs agent={agent} packagePolicy={packagePolicy} />
      {policyResponseExtensionViewWrapper}
      {genericErrorsListExtensionViewWrapper}
      <EuiSpacer />
    </CollapsablePanel>
  );
});
