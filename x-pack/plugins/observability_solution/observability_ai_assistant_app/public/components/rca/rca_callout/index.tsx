/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { AssistantAvatar } from '@kbn/observability-ai-assistant-plugin/public';
import { css } from '@emotion/css';

export function RootCauseAnalysisCallout({ onClick }: { onClick: () => void }) {
  return (
    <EuiCallOut color="primary">
      <EuiPanel color="transparent" hasShadow={false} hasBorder={false}>
        <EuiFlexGroup direction="column" alignItems="center">
          <EuiFlexGroup direction="row" alignItems="center" justifyContent="center">
            <AssistantAvatar />
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h2>
                  {i18n.translate('xpack.observabilityAiAssistant.rca.calloutTitle', {
                    defaultMessage: 'AI-assisted root cause analysis',
                  })}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiFlexItem
            grow={false}
            className={css`
              width: 512px;
            `}
          >
            <EuiText size="m">
              {i18n.translate('xpack.observabilityAiAssistant.rca.calloutText', {
                defaultMessage: `Start an automated investigation that will analyze
              log patterns, SLOs and alerts for entities and provide an evidence-
              based root cause analysis of issues in your system.`,
              })}
            </EuiText>
          </EuiFlexItem>
          <EuiButton
            data-test-subj="observabilityAiAssistantAppRootCauseAnalysisCalloutStartAnalysisButton"
            iconType="sparkles"
            fill
            onClick={onClick}
          >
            {i18n.translate('xpack.observabilityAiAssistant.rca.calloutText', {
              defaultMessage: 'Start analysis',
            })}
          </EuiButton>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiCallOut>
  );
}
