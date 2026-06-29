/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { NightshiftIllustration } from './nightshift_illustration';

export interface NightshiftAppProps {
  onStartOnboarding?: () => void;
  agentBuilderAvailable?: boolean;
  onDetectGaps?: () => void;
  isDetectingGaps?: boolean;
}

export function NightshiftApp({
  onStartOnboarding,
  agentBuilderAvailable,
  onDetectGaps,
  isDetectingGaps,
}: NightshiftAppProps) {
  const actions = [
    agentBuilderAvailable && onStartOnboarding ? (
      <EuiButton
        key="onboarding"
        fill
        iconType="sparkles"
        onClick={onStartOnboarding}
        data-test-subj="nightshiftStartOnboardingButton"
      >
        {i18n.translate('xpack.nightshift.startOnboardingButton', {
          defaultMessage: 'Tell us about your system',
        })}
      </EuiButton>
    ) : null,
    onDetectGaps ? (
      <EuiButton
        key="detectGaps"
        iconType="inspect"
        onClick={onDetectGaps}
        isLoading={isDetectingGaps}
        data-test-subj="nightshiftDetectGapsButton"
      >
        {i18n.translate('xpack.nightshift.detectGapsButton', {
          defaultMessage: 'Detect gaps',
        })}
      </EuiButton>
    ) : null,
  ].filter(Boolean);

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
          actions={actions.length > 0 ? actions : undefined}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
