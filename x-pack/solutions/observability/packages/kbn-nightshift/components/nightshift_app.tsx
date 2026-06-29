/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { NightshiftIllustration } from './nightshift_illustration';

export interface GapsDimension {
  id: string;
  name: string;
  status: 'known' | 'partial' | 'missing';
  summary: string;
}

export interface RecommendedConnector {
  type: string;
  name: string;
  rationale: string;
}

export interface GapsOverview {
  generated_at: string;
  summary: string;
  dimensions: GapsDimension[];
  recommended_connectors: RecommendedConnector[];
}

export interface NightshiftAppProps {
  onStartOnboarding?: () => void;
  agentBuilderAvailable?: boolean;
  gapsOverview?: GapsOverview | null;
}

const STATUS_COLOR: Record<GapsDimension['status'], string> = {
  known: 'success',
  partial: 'warning',
  missing: 'danger',
};

const CONNECTOR_ICON: Record<string, string> = {
  slack: 'logoSlack',
  github: 'logoGithub',
  jira: 'logoJira',
};

const onboardingButtonLabel = i18n.translate('xpack.nightshift.startOnboardingButton', {
  defaultMessage: 'Tell us about your system',
});

export function NightshiftApp({
  onStartOnboarding,
  agentBuilderAvailable,
  gapsOverview,
}: NightshiftAppProps) {
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

  if (!gapsOverview) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: '60vh' }}>
        <EuiFlexItem grow={false}>
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
                  {i18n.translate('xpack.nightshift.emptyState.description', {
                    defaultMessage:
                      'Help Nightshift understand your system to detect and surface the right significant events for you.',
                  })}
                </p>
              </EuiText>
            }
            actions={onboardingButton ?? undefined}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup
      justifyContent="center"
      style={{ padding: '24px 0' }}
      data-test-subj="nightshiftGapsOverview"
    >
      <EuiFlexItem style={{ maxWidth: 720 }}>
        <EuiText>
          <h2>{i18n.translate('xpack.nightshift.title', { defaultMessage: 'Nightshift' })}</h2>
          <p>{gapsOverview.summary}</p>
        </EuiText>
        <EuiText size="xs" color="subdued">
          <p>
            {i18n.translate('xpack.nightshift.lastAnalyzed', {
              defaultMessage: 'Last analyzed: {date}',
              values: { date: new Date(gapsOverview.generated_at).toLocaleString() },
            })}
          </p>
        </EuiText>

        <EuiSpacer size="l" />

        <EuiPanel paddingSize="l" hasBorder>
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.nightshift.knowledgeCoverageTitle', {
                defaultMessage: 'Knowledge coverage',
              })}
            </h3>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="nightshiftDimensionList">
            {gapsOverview.dimensions.map((dim) => (
              <EuiFlexItem key={dim.id}>
                <EuiFlexGroup gutterSize="m" alignItems="flexStart" responsive={false}>
                  <EuiFlexItem grow={false} style={{ minWidth: 220 }}>
                    <EuiHealth color={STATUS_COLOR[dim.status]}>{dim.name}</EuiHealth>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="s" color="subdued">
                      <span>{dim.summary}</span>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiPanel>

        {gapsOverview.recommended_connectors.length > 0 && (
          <>
            <EuiSpacer size="l" />
            <EuiPanel paddingSize="l" hasBorder>
              <EuiTitle size="xs">
                <h3>
                  {i18n.translate('xpack.nightshift.suggestedConnectorsTitle', {
                    defaultMessage: 'Suggested connectors',
                  })}
                </h3>
              </EuiTitle>
              <EuiSpacer size="m" />
              <EuiFlexGroup
                direction="column"
                gutterSize="s"
                data-test-subj="nightshiftConnectorList"
              >
                {gapsOverview.recommended_connectors.map((connector) => (
                  <EuiFlexItem key={connector.type}>
                    <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EuiIcon
                          type={CONNECTOR_ICON[connector.type] ?? 'link'}
                          size="m"
                          title={connector.name}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false} style={{ minWidth: 120 }}>
                        <EuiText size="s">
                          <strong>{connector.name}</strong>
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiText size="s" color="subdued">
                          <span>{connector.rationale}</span>
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </EuiPanel>
          </>
        )}

        {onboardingButton && (
          <>
            <EuiSpacer size="l" />
            <EuiFlexGroup justifyContent="flexStart">
              <EuiFlexItem grow={false}>{onboardingButton}</EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
