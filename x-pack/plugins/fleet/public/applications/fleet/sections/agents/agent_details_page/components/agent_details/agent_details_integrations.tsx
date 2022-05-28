/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { EuiBasicTableProps } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiAccordion,
  EuiTitle,
  EuiToolTip,
  EuiPanel,
  EuiButtonIcon,
  EuiBasicTable,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';

import type { Agent, AgentPolicy, PackagePolicy, PackagePolicyInput } from '../../../../../types';
import { useLink } from '../../../../../hooks';
import { PackageIcon } from '../../../../../components';

import { displayInputType, getLogsQueryByInputType } from './input_type_utils';

const StyledEuiAccordion = styled(EuiAccordion)`
  .ingest-integration-title-button {
    padding: ${(props) => props.theme.eui.paddingSizes.m};
  }

  &.euiAccordion-isOpen .ingest-integration-title-button {
    border-bottom: 1px solid ${(props) => props.theme.eui.euiColorLightShade};
  }

  .euiTableRow:last-child .euiTableRowCell {
    border-bottom: none;
  }

  .euiIEFlexWrapFix {
    min-width: 0;
  }
`;

const CollapsablePanel: React.FC<{ id: string; title: React.ReactNode }> = ({
  id,
  title,
  children,
}) => {
  return (
    <EuiPanel paddingSize="none">
      <StyledEuiAccordion
        id={id}
        arrowDisplay="right"
        buttonClassName="ingest-integration-title-button"
        buttonContent={title}
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
}> = memo(({ agent, agentPolicy, packagePolicy }) => {
  const { getHref } = useLink();

  const inputs = useMemo(() => {
    return packagePolicy.inputs.filter((input) => input.enabled);
  }, [packagePolicy.inputs]);

  const columns: EuiBasicTableProps<PackagePolicyInput>['columns'] = [
    {
      field: 'type',
      width: '100%',
      name: i18n.translate('xpack.fleet.agentDetailsIntegrations.inputTypeLabel', {
        defaultMessage: 'Input',
      }),
      render: (inputType: string) => {
        return displayInputType(inputType);
      },
    },
    {
      align: 'right',
      name: i18n.translate('xpack.fleet.agentDetailsIntegrations.actionsLabel', {
        defaultMessage: 'Actions',
      }),
      field: 'type',
      width: 'auto',
      render: (inputType: string) => {
        return (
          <EuiToolTip
            content={i18n.translate('xpack.fleet.agentDetailsIntegrations.viewLogsButton', {
              defaultMessage: 'View logs',
            })}
          >
            <EuiButtonIcon
              href={getHref('agent_details', {
                agentId: agent.id,
                tabId: 'logs',
                logQuery: getLogsQueryByInputType(inputType),
              })}
              iconType="editorAlignLeft"
              aria-label={i18n.translate('xpack.fleet.agentDetailsIntegrations.viewLogsButton', {
                defaultMessage: 'View logs',
              })}
            />
          </EuiToolTip>
        );
      },
    },
  ];

  return (
    <CollapsablePanel
      id={packagePolicy.id}
      title={
        <EuiTitle size="xs">
          <h3>
            <EuiFlexGroup gutterSize="s">
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
            </EuiFlexGroup>
          </h3>
        </EuiTitle>
      }
    >
      <EuiBasicTable<PackagePolicyInput> tableLayout="auto" items={inputs} columns={columns} />
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
      {(agentPolicy.package_policies as PackagePolicy[]).map((packagePolicy) => {
        return (
          <EuiFlexItem grow={false} key={packagePolicy.id}>
            <AgentDetailsIntegration
              agent={agent}
              agentPolicy={agentPolicy}
              packagePolicy={packagePolicy}
            />
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
});
