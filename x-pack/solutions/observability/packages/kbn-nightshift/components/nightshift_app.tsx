/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiIcon,
  EuiMarkdownFormat,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { NightshiftIllustration } from './nightshift_illustration';

export interface GapsReport {
  title: string;
  content: string;
  updated_at: string;
}

interface CommonConnectorType {
  id: string;
  actionTypeIds: readonly string[];
  name: string;
  description: string;
}

export interface NightshiftAppProps {
  onStartOnboarding?: () => void;
  onStartGapClosing?: () => void;
  agentBuilderAvailable?: boolean;
  gapsReport?: GapsReport | null;
  installedConnectorActionTypeIds?: string[];
}

const COMMON_OBSERVABILITY_CONNECTORS: CommonConnectorType[] = [
  {
    id: 'slack',
    actionTypeIds: ['.slack', '.slack_api', '.slack2'],
    name: i18n.translate('xpack.nightshift.commonConnectors.slackName', {
      defaultMessage: 'Slack',
    }),
    description: i18n.translate('xpack.nightshift.commonConnectors.slackDescription', {
      defaultMessage: 'Bring team conversations and incident handoffs into the workflow.',
    }),
  },
  {
    id: 'microsoftTeams',
    actionTypeIds: ['.teams', '.microsoft-teams'],
    name: i18n.translate('xpack.nightshift.commonConnectors.microsoftTeamsName', {
      defaultMessage: 'Microsoft Teams',
    }),
    description: i18n.translate('xpack.nightshift.commonConnectors.microsoftTeamsDescription', {
      defaultMessage: 'Connect collaboration channels where operational context is discussed.',
    }),
  },
  {
    id: 'pagerDuty',
    actionTypeIds: ['.pagerduty', '.pagerduty_mcp'],
    name: i18n.translate('xpack.nightshift.commonConnectors.pagerDutyName', {
      defaultMessage: 'PagerDuty',
    }),
    description: i18n.translate('xpack.nightshift.commonConnectors.pagerDutyDescription', {
      defaultMessage: 'Use on-call and escalation data to understand response ownership.',
    }),
  },
  {
    id: 'jira',
    actionTypeIds: ['.jira', '.jira-cloud'],
    name: i18n.translate('xpack.nightshift.commonConnectors.jiraName', {
      defaultMessage: 'Jira',
    }),
    description: i18n.translate('xpack.nightshift.commonConnectors.jiraDescription', {
      defaultMessage: 'Link alerts and gaps to tickets, deployments, and ownership trails.',
    }),
  },
  {
    id: 'serviceNow',
    actionTypeIds: ['.servicenow', '.servicenow-sir', '.servicenow-itom', '.servicenow_search'],
    name: i18n.translate('xpack.nightshift.commonConnectors.serviceNowName', {
      defaultMessage: 'ServiceNow',
    }),
    description: i18n.translate('xpack.nightshift.commonConnectors.serviceNowDescription', {
      defaultMessage: 'Bring change, incident, and service-management records into context.',
    }),
  },
  {
    id: 'github',
    actionTypeIds: ['.github'],
    name: i18n.translate('xpack.nightshift.commonConnectors.githubName', {
      defaultMessage: 'GitHub',
    }),
    description: i18n.translate('xpack.nightshift.commonConnectors.githubDescription', {
      defaultMessage: 'Use source history and ownership to connect events with code changes.',
    }),
  },
  {
    id: 'webhook',
    actionTypeIds: ['.webhook', '.cases-webhook'],
    name: i18n.translate('xpack.nightshift.commonConnectors.webhookName', {
      defaultMessage: 'Webhook',
    }),
    description: i18n.translate('xpack.nightshift.commonConnectors.webhookDescription', {
      defaultMessage: 'Connect custom systems that expose operational state or runbook actions.',
    }),
  },
];

const onboardingButtonLabel = i18n.translate('xpack.nightshift.startOnboardingButton', {
  defaultMessage: 'Tell us about your system',
});

const viewGapsButtonLabel = i18n.translate('xpack.nightshift.viewGapsButtonLabel', {
  defaultMessage: 'Review knowledge gaps',
});

const closeGapsButtonLabel = i18n.translate('xpack.nightshift.closeGapsButtonLabel', {
  defaultMessage: 'Close those gaps via chat',
});

const closeButtonLabel = i18n.translate('xpack.nightshift.closeFlyoutButtonLabel', {
  defaultMessage: 'Close',
});

export function NightshiftApp({
  onStartOnboarding,
  onStartGapClosing,
  agentBuilderAvailable,
  gapsReport,
  installedConnectorActionTypeIds = [],
}: NightshiftAppProps) {
  const [isGapsFlyoutOpen, setIsGapsFlyoutOpen] = useState(false);
  const flyoutTitleId = useGeneratedHtmlId();
  const installedConnectorIds = useMemo(
    () => new Set(installedConnectorActionTypeIds),
    [installedConnectorActionTypeIds]
  );
  const missingConnectorTypes = useMemo(
    () =>
      COMMON_OBSERVABILITY_CONNECTORS.filter(
        (connectorType) =>
          !connectorType.actionTypeIds.some((actionTypeId) =>
            installedConnectorIds.has(actionTypeId)
          )
      ),
    [installedConnectorIds]
  );

  const onboardingButton =
    agentBuilderAvailable && onStartOnboarding ? (
      <EuiButton
        fill
        iconType="sparkles"
        onClick={onStartOnboarding}
        data-test-subj="nightshiftStartOnboardingButton"
      >
        {onboardingButtonLabel}
      </EuiButton>
    ) : null;

  const viewGapsButton = gapsReport ? (
    <EuiButtonEmpty
      iconType="inspect"
      onClick={() => setIsGapsFlyoutOpen(true)}
      data-test-subj="nightshiftViewGapsButton"
    >
      {viewGapsButtonLabel}
    </EuiButtonEmpty>
  ) : null;

  const actions =
    onboardingButton || viewGapsButton ? (
      <EuiFlexGroup gutterSize="s" justifyContent="center" responsive={false} wrap>
        {viewGapsButton && <EuiFlexItem grow={false}>{viewGapsButton}</EuiFlexItem>}
        {onboardingButton && <EuiFlexItem grow={false}>{onboardingButton}</EuiFlexItem>}
      </EuiFlexGroup>
    ) : undefined;

  return (
    <>
      <EuiFlexGroup justifyContent="center" style={{ padding: '24px 0' }}>
        <EuiFlexItem style={{ maxWidth: 840 }}>
          <EuiEmptyPrompt
            data-test-subj="nightshiftEmptyState"
            icon={<NightshiftIllustration />}
            title={
              <h2>
                {i18n.translate('xpack.nightshift.emptyState.title', {
                  defaultMessage: 'Nightshift',
                })}
              </h2>
            }
            body={
              <EuiText color="subdued" size="s">
                <p>
                  {gapsReport
                    ? i18n.translate('xpack.nightshift.emptyState.gapsDescription', {
                        defaultMessage:
                          'Review the latest knowledge gaps or continue in chat to add missing operational context.',
                      })
                    : i18n.translate('xpack.nightshift.emptyState.description', {
                        defaultMessage:
                          'Help Nightshift understand your system to detect and surface the right significant events for you.',
                      })}
                </p>
              </EuiText>
            }
            actions={actions}
          />

          {missingConnectorTypes.length > 0 && (
            <>
              <EuiSpacer size="xl" />
              <EuiPanel paddingSize="l" hasBorder data-test-subj="nightshiftMissingConnectors">
                <EuiTitle size="xs">
                  <h3>
                    {i18n.translate('xpack.nightshift.commonConnectorsTitle', {
                      defaultMessage: 'Common connectors to add',
                    })}
                  </h3>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EuiText size="s" color="subdued">
                  <p>
                    {i18n.translate('xpack.nightshift.commonConnectorsDescription', {
                      defaultMessage:
                        'These connector types often help Nightshift understand operational context across alerts, incidents, code, and team communication.',
                    })}
                  </p>
                </EuiText>
                <EuiSpacer size="m" />
                <EuiFlexGroup direction="column" gutterSize="m">
                  {missingConnectorTypes.map((connectorType) => (
                    <EuiFlexItem
                      key={connectorType.id}
                      data-test-subj="nightshiftMissingConnectorType"
                    >
                      <EuiFlexGroup gutterSize="m" alignItems="flexStart" responsive={false}>
                        <EuiFlexItem grow={false}>
                          <EuiIcon type="link" size="m" />
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <EuiText size="s">
                            <strong>{connectorType.name}</strong>
                          </EuiText>
                          <EuiText size="s" color="subdued">
                            <p>{connectorType.description}</p>
                          </EuiText>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                  ))}
                </EuiFlexGroup>
              </EuiPanel>
            </>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>

      {isGapsFlyoutOpen && gapsReport && (
        <EuiFlyout
          onClose={() => setIsGapsFlyoutOpen(false)}
          aria-labelledby={flyoutTitleId}
          maxWidth={720}
          data-test-subj="nightshiftGapsFlyout"
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2 id={flyoutTitleId}>{gapsReport.title}</h2>
            </EuiTitle>
            <EuiSpacer size="xs" />
            <EuiText size="xs" color="subdued">
              <p>
                {i18n.translate('xpack.nightshift.gapsFlyoutUpdatedLabel', {
                  defaultMessage: 'Updated: {date}',
                  values: { date: new Date(gapsReport.updated_at).toLocaleString() },
                })}
              </p>
            </EuiText>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiMarkdownFormat textSize="s" data-test-subj="nightshiftGapsMarkdown">
              {gapsReport.content}
            </EuiMarkdownFormat>
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="kbnNightshiftNightshiftAppButton"
                  flush="left"
                  onClick={() => setIsGapsFlyoutOpen(false)}
                >
                  {closeButtonLabel}
                </EuiButtonEmpty>
              </EuiFlexItem>
              {agentBuilderAvailable && onStartGapClosing && (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    iconType="sparkles"
                    onClick={() => {
                      setIsGapsFlyoutOpen(false);
                      onStartGapClosing();
                    }}
                    data-test-subj="nightshiftCloseGapsButton"
                  >
                    {closeGapsButtonLabel}
                  </EuiButton>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      )}
    </>
  );
}
