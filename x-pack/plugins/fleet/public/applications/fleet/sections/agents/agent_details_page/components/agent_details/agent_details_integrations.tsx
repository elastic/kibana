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
  EuiToolTip,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTreeView,
  EuiBadge,
  useEuiTheme,
} from '@elastic/eui';
import { filter } from 'lodash';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import styled from 'styled-components';

import type { EuiAccordionProps } from '@elastic/eui/src/components/accordion';

import type { Agent, AgentPolicy, PackagePolicy } from '../../../../../types';
import type { FleetServerAgentComponentUnit } from '../../../../../../../../common/types/models/agent';
import { useLink, useUIExtension } from '../../../../../hooks';
import { ExtensionWrapper, PackageIcon } from '../../../../../components';

import { displayInputType, getLogsQueryByInputType } from './input_type_utils';

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

const StyledEuiLink = styled(EuiLink)`
  font-size: ${(props) => props.theme.eui.euiFontSizeS};
`;

const CollapsablePanel: React.FC<{
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
  const extensionView = useUIExtension(
    packagePolicy.package?.name ?? '',
    'package-policy-response'
  );
  const genericErrorsListExtensionView = useUIExtension(
    packagePolicy.package?.name ?? '',
    'package-generic-errors-list'
  );

  const policyResponseExtensionView = useMemo(() => {
    return (
      extensionView && (
        <ExtensionWrapper>
          <extensionView.Component
            agent={agent}
            onShowNeedsAttentionBadge={setIsAttentionBadgeNeededForPolicyResponse}
          />
        </ExtensionWrapper>
      )
    );
  }, [agent, extensionView]);

  const packageErrors = useMemo(() => {
    const packageErrorUnits: FleetServerAgentComponentUnit[] = [];
    if (!agent.components) {
      return packageErrorUnits;
    }

    const filteredPackageComponents = filter(agent.components, {
      type: packagePolicy.package?.name,
    });

    filteredPackageComponents.forEach((component) => {
      packageErrorUnits.push(
        ...filter(component.units, (u) => u.status === 'DEGRADED' || u.status === 'FAILED')
      );
    });
    return packageErrorUnits;
  }, [agent.components, packagePolicy]);

  const showNeedsAttentionBadge = isAttentionBadgeNeededForPolicyResponse || !!packageErrors.length;

  const genericErrorsListExtensionViewWrapper = useMemo(() => {
    return (
      genericErrorsListExtensionView && (
        <ExtensionWrapper>
          <genericErrorsListExtensionView.Component packageErrors={packageErrors} />
        </ExtensionWrapper>
      )
    );
  }, [packageErrors, genericErrorsListExtensionView]);

  const inputItems = [
    {
      label: (
        <EuiText size="s">
          <FormattedMessage
            id="xpack.fleet.agentDetailsIntegrations.inputsTypeLabel"
            defaultMessage="Inputs"
          />
        </EuiText>
      ),
      id: 'inputs',
      children: packagePolicy.inputs.reduce(
        (acc: Array<{ label: JSX.Element; id: string }>, current) => {
          if (current.enabled) {
            return [
              ...acc,
              {
                label: (
                  <EuiToolTip
                    content={i18n.translate('xpack.fleet.agentDetailsIntegrations.viewLogsButton', {
                      defaultMessage: 'View logs',
                    })}
                  >
                    <StyledEuiLink
                      href={getHref('agent_details', {
                        agentId: agent.id,
                        tabId: 'logs',
                        logQuery: getLogsQueryByInputType(current.type),
                      })}
                      aria-label={i18n.translate(
                        'xpack.fleet.agentDetailsIntegrations.viewLogsButton',
                        {
                          defaultMessage: 'View logs',
                        }
                      )}
                    >
                      {displayInputType(current.type)}
                    </StyledEuiLink>
                  </EuiToolTip>
                ),
                id: current.type,
              },
            ];
          }
          return acc;
        },
        []
      ),
    },
  ];

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
      <EuiTreeView
        items={inputItems}
        showExpansionArrows
        aria-label="inputsTreeView"
        aria-labelledby="inputsTreeView"
      />
      {policyResponseExtensionView}
      {genericErrorsListExtensionViewWrapper}
      <EuiSpacer />
    </CollapsablePanel>
  );
});

export const AgentDetailsIntegrationsSection: React.FunctionComponent<{
  agent: Agent;
  agentPolicy?: AgentPolicy;
}> = memo(({ agent, agentPolicy }) => {
  if (!agentPolicy || !agentPolicy.package_policies) {
    return null;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {(agentPolicy.package_policies as PackagePolicy[]).map((packagePolicy, index) => {
        const testSubj = (packagePolicy.package?.name ?? 'packagePolicy') + '-' + index;

        return (
          <EuiFlexItem grow={false} key={packagePolicy.id} data-test-subj={testSubj}>
            <AgentDetailsIntegration
              agent={agent}
              agentPolicy={agentPolicy}
              packagePolicy={packagePolicy}
              data-test-subj={`${testSubj}-accordion`}
            />
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
});
