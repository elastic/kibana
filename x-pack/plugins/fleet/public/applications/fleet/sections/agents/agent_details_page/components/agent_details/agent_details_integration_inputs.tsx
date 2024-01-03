/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import {
  EuiHealth,
  EuiLink,
  EuiNotificationBadge,
  EuiToolTip,
  EuiText,
  EuiTreeView,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import styled from 'styled-components';

import type { Agent, PackagePolicy } from '../../../../../types';
import { useLink } from '../../../../../hooks';

import { AgentDetailsIntegrationInputStatus } from './agent_details_integration_input_status';
import { displayInputType, getLogsQueryByInputType } from './input_type_utils';
import { getInputUnitsByPackage, InputStatusFormatter } from './input_status_utils';

const StyledEuiLink = styled(EuiLink)`
  font-size: ${(props) => props.theme.eui.euiFontSizeS};
`;

const StyledEuiTreeView = styled(EuiTreeView)`
  .input-action-item-expanded {
    height: auto;
    padding-top: ${({ theme }) => theme.eui.euiSizeS};
    padding-bottom: ${({ theme }) => theme.eui.euiSizeS};
    .euiTreeView__nodeLabel {
      width: 100%;
    }
  }
  .inputStatusHealth {
    padding-top: 5px;
  }
  .euiTreeView__node--expanded {
    max-height: none !important;
    .policy-response-action-expanded + div {
      .euiTreeView__node {
        // When response action item displays a callout, this needs to be overwritten to remove the default max height of EuiTreeView
        max-height: none !important;
      }
    }
  }
  .euiTreeView__node {
    max-height: none !important;
    .euiNotificationBadge {
      margin-right: 5px;
    }
    .euiTreeView__nodeLabel {
      .euiText {
        font-size: ${({ theme }) => theme.eui.euiFontSize};
      }
    }
  }
`;

export const AgentDetailsIntegrationInputs: React.FunctionComponent<{
  agent: Agent;
  packagePolicy: PackagePolicy;
  'data-test-subj'?: string;
}> = memo(({ agent, packagePolicy, 'data-test-subj': dataTestSubj }) => {
  const { getHref } = useLink();

  const inputStatusMap = useMemo(
    () =>
      packagePolicy.inputs.reduce((acc, current) => {
        if (!agent.components) {
          return new Map<string, InputStatusFormatter>();
        }
        if (current.enabled) {
          const agentUnit = getInputUnitsByPackage(agent.components, packagePolicy)?.find((i) =>
            i.id.match(new RegExp(current.type))
          );
          acc.set(
            current.type,
            agentUnit
              ? new InputStatusFormatter(agentUnit.status, agentUnit.message)
              : new InputStatusFormatter()
          );
        }
        return acc;
      }, new Map<string, InputStatusFormatter>()),
    [agent.components, packagePolicy]
  );

  const getInputStatusIcon = (inputType: string) => {
    const inputStatus = inputStatusMap.get(inputType)!;
    if (inputStatus?.status === undefined) {
      return (
        <EuiHealth
          color="default"
          data-test-subj="agentDetailsIntegrationsInputStatusHealthDefault"
          className="inputStatusHealth"
        />
      );
    }
    return inputStatus.status === 'HEALTHY' ? (
      <EuiHealth
        color="success"
        data-test-subj="agentDetailsIntegrationsInputStatusHealthSuccess"
        className="inputStatusHealth"
      />
    ) : (
      <EuiNotificationBadge data-test-subj="agentDetailsIntegrationsInputStatusAttentionHealth">
        {1}
      </EuiNotificationBadge>
    );
  };

  const generateInputResponse = () => {
    return packagePolicy.inputs.reduce(
      (
        acc: Array<{
          label: JSX.Element;
          id: string;
          icon: JSX.Element;
          children: Array<{ label: JSX.Element; id: string }>;
        }>,
        current
      ) => {
        if (current.enabled) {
          const inputStatusFormatter = inputStatusMap.get(current.type);
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
              icon: getInputStatusIcon(current.type),
              children: !!inputStatusFormatter
                ? [
                    {
                      label: (
                        <AgentDetailsIntegrationInputStatus
                          inputStatusFormatter={inputStatusFormatter}
                        />
                      ),
                      id: `input-status-${current.type}`,
                      isExpanded: true,
                      className: 'input-action-item-expanded',
                    },
                  ]
                : [],
            },
          ];
        }
        return acc;
      },
      []
    );
  };

  const generateInputsTreeView = () => {
    const inputsTotalErrors = Array.from(inputStatusMap.values()).reduce((acc, input) => {
      if (input.hasError) {
        acc += 1;
      }
      return acc;
    }, 0);
    return [
      {
        label: (
          <EuiText
            color={inputsTotalErrors ? 'danger' : 'default'}
            size="s"
            data-test-subj="agentIntegrationsInputsTitle"
          >
            <FormattedMessage
              id="xpack.fleet.agentDetailsIntegrations.inputsTypeLabel"
              defaultMessage="Inputs"
            />
          </EuiText>
        ),
        id: 'agentIntegrationsInputs',
        icon: inputsTotalErrors ? (
          <EuiNotificationBadge data-test-subj="agentIntegrationsInputsStatusHealth">
            {inputsTotalErrors}
          </EuiNotificationBadge>
        ) : undefined,
        children: generateInputResponse(),
      },
    ];
  };

  return (
    <StyledEuiTreeView
      items={generateInputsTreeView()}
      showExpansionArrows
      aria-label="inputsTreeView"
      aria-labelledby="inputsTreeView"
    />
  );
});
