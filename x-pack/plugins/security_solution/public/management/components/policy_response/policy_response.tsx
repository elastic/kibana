/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { capitalize } from 'lodash';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiHealth, EuiText, EuiTreeView, EuiNotificationBadge } from '@elastic/eui';
import { PolicyResponseArtifactItem } from './policy_response_artifact_item';
import { useKibana } from '../../../common/lib/kibana';
import type {
  HostPolicyResponseAppliedAction,
  HostPolicyResponseArtifacts,
  HostPolicyResponseConfiguration,
  Immutable,
  ImmutableArray,
  ImmutableObject,
} from '../../../../common/endpoint/types';
import { HostPolicyResponseActionStatus } from '../../../../common/endpoint/types';
import { formatResponse, PolicyResponseActionFormatter } from './policy_response_friendly_names';
import { PolicyResponseActionItem } from './policy_response_action_item';

// Most of them are needed in order to display large react nodes (PolicyResponseActionItem) in child levels.
const StyledEuiTreeView = styled(EuiTreeView)`
  & .policy-response-artifact-item {
    & .euiTreeView__nodeLabel {
      width: 100%;
    }
  }

  & .policy-response-action-item-expanded {
    height: auto;
    padding-top: ${({ theme }) => theme.eui.euiSizeS};
    padding-bottom: ${({ theme }) => theme.eui.euiSizeS};

    & .euiTreeView__nodeLabel {
      width: 100%;
    }
  }

  & .policyResponseStatusHealth {
    padding-top: 5px;
  }

  & .euiTreeView__node--expanded {
    max-height: none !important;

    & .policy-response-action-expanded + div {
      & .euiTreeView__node {
        // When response action item displays a callout, this needs to be overwritten to remove the default max height of EuiTreeView
        max-height: none !important;
      }
    }
  }

  & .euiTreeView__node {
    max-height: none !important;

    & .euiNotificationBadge {
      margin-right: 5px;
    }

    & .euiTreeView__nodeLabel {
      & .euiText {
        font-size: ${({ theme }) => theme.eui.euiFontSize};
      }
    }
  }
`;

interface PolicyResponseProps {
  hostOs: string;
  policyResponseConfig: Immutable<HostPolicyResponseConfiguration>;
  policyResponseActions: Immutable<HostPolicyResponseAppliedAction[]>;
  policyResponseArtifacts: Immutable<HostPolicyResponseArtifacts>;
  policyResponseAttentionCount: Map<string, number>;
}

/**
 * A policy response is returned by the endpoint and shown in the host details after a user modifies a policy
 */
export const PolicyResponse = memo(
  ({
    hostOs,
    policyResponseConfig,
    policyResponseActions,
    policyResponseArtifacts,
    policyResponseAttentionCount,
  }: PolicyResponseProps) => {
    const { docLinks } = useKibana().services;
    const getEntryIcon = useCallback(
      (status: HostPolicyResponseActionStatus, unsuccessCounts: number) =>
        status === HostPolicyResponseActionStatus.success ? (
          <EuiHealth
            color="success"
            data-test-subj="endpointPolicyResponseStatusSuccessHealth"
            className="policyResponseStatusHealth"
          />
        ) : status === HostPolicyResponseActionStatus.unsupported ? (
          <EuiHealth
            color="subdued"
            data-test-subj="endpointPolicyResponseStatusSuccessHealth"
            className="policyResponseStatusHealth"
          />
        ) : (
          <EuiNotificationBadge data-test-subj="endpointPolicyResponseStatusAttentionHealth">
            {unsuccessCounts}
          </EuiNotificationBadge>
        ),
      []
    );

    const getConcernedActions = useCallback(
      (concernedActions: ImmutableArray<string>) => {
        return concernedActions.map((actionKey) => {
          const action = policyResponseActions.find(
            (currentAction) => currentAction.name === actionKey
          ) as ImmutableObject<HostPolicyResponseAppliedAction>;

          const policyResponseActionFormatter = new PolicyResponseActionFormatter(
            action || {},
            docLinks.links.securitySolution.policyResponseTroubleshooting,
            hostOs
          );
          return {
            label: (
              <EuiText
                color={
                  action.status !== HostPolicyResponseActionStatus.success &&
                  action.status !== HostPolicyResponseActionStatus.unsupported
                    ? 'danger'
                    : 'default'
                }
                data-test-subj="endpointPolicyResponseAction"
              >
                {policyResponseActionFormatter.title}
              </EuiText>
            ),
            id: actionKey,
            className:
              action.status !== HostPolicyResponseActionStatus.success &&
              action.status !== HostPolicyResponseActionStatus.unsupported
                ? 'policy-response-action-expanded'
                : '',
            icon: getEntryIcon(
              action.status,
              action.status !== HostPolicyResponseActionStatus.success ? 1 : 0
            ),
            children: [
              {
                label: (
                  <PolicyResponseActionItem
                    policyResponseActionFormatter={policyResponseActionFormatter}
                  />
                ),
                id: `action_message_${actionKey}`,
                isExpanded: true,
                className: 'policy-response-action-item-expanded',
              },
            ],
          };
        });
      },
      [
        docLinks.links.securitySolution.policyResponseTroubleshooting,
        getEntryIcon,
        policyResponseActions,
        hostOs,
      ]
    );

    const getArtifacts = useCallback(
      (
        artifactIdentifiers: PolicyResponseProps['policyResponseArtifacts'][
          | 'global'
          | 'user']['identifiers']
      ) => {
        return artifactIdentifiers.map((artifact) => {
          return {
            label: <PolicyResponseArtifactItem artifact={artifact} key={artifact.sha256} />,
            id: artifact.name,
            className: 'policy-response-artifact-item',
          };
        });
      },
      []
    );

    const getResponseConfigs = useCallback(() => {
      const config = Object.entries(policyResponseConfig).map(([key, val]) => {
        const attentionCount = policyResponseAttentionCount.get(key);
        return {
          label: (
            <EuiText
              color={attentionCount ? 'danger' : 'default'}
              size="s"
              data-test-subj="endpointPolicyResponseConfig"
            >
              {formatResponse(key)}
            </EuiText>
          ),
          id: key,
          icon: attentionCount ? (
            <EuiNotificationBadge data-test-subj="endpointPolicyResponseStatusAttentionHealth">
              {attentionCount}
            </EuiNotificationBadge>
          ) : (
            <EuiHealth
              color="success"
              data-test-subj="endpointPolicyResponseStatusSuccessHealth"
              className="policyResponseStatusHealth"
            />
          ),
          children: getConcernedActions(val.concerned_actions),
        };
      });

      const artifacts = {
        label: (
          <EuiText color={'default'} size="s" data-test-subj="endpointPolicyResponseArtifactsTitle">
            <FormattedMessage
              id="xpack.securitySolution.endpoint.policyResponse.artifacts.title"
              defaultMessage="Artifacts"
            />
          </EuiText>
        ),
        id: 'policyResponseArtifacts',
        icon: (
          <EuiHealth
            color="success"
            data-test-subj="endpointPolicyResponseStatusSuccessHealth"
            className="policyResponseStatusHealth"
          />
        ),
        children: Object.entries(policyResponseArtifacts).map(([key, val]) => {
          return {
            label: (
              <EuiText
                color="default"
                size="s"
                data-test-subj={`endpointPolicyResponseArtifact${capitalize(key)}`}
              >
                {`${capitalize(key)} (v${val.version})`}
              </EuiText>
            ),
            id: key,
            icon: (
              <EuiHealth
                color="success"
                data-test-subj="endpointPolicyResponseStatusSuccessHealth"
                className="policyResponseStatusHealth"
              />
            ),
            children: getArtifacts(val.identifiers),
          };
        }),
      };
      return [...config, artifacts];
    }, [
      getArtifacts,
      getConcernedActions,
      policyResponseArtifacts,
      policyResponseAttentionCount,
      policyResponseConfig,
    ]);

    const generateTreeView = useCallback(() => {
      let policyTotalErrors = 0;
      for (const count of policyResponseAttentionCount.values()) {
        policyTotalErrors += count;
      }
      return [
        {
          label: (
            <EuiText
              color={policyTotalErrors ? 'danger' : 'default'}
              size="s"
              data-test-subj="endpointPolicyResponseTitle"
            >
              <FormattedMessage
                id="xpack.securitySolution.endpoint.policyResponse.title"
                defaultMessage="Policy Response"
              />
            </EuiText>
          ),
          id: 'policyResponse',
          icon: policyTotalErrors ? (
            <EuiNotificationBadge data-test-subj="endpointPolicyResponseStatusHealth">
              {policyTotalErrors}
            </EuiNotificationBadge>
          ) : undefined,
          children: getResponseConfigs(),
        },
      ];
    }, [getResponseConfigs, policyResponseAttentionCount]);

    const generatedTreeView = generateTreeView();

    return (
      <StyledEuiTreeView
        items={generatedTreeView}
        showExpansionArrows
        aria-label="policyResponseTreeView"
        aria-labelledby="policyResponseTreeView"
      />
    );
  }
);

PolicyResponse.displayName = 'PolicyResponse';
