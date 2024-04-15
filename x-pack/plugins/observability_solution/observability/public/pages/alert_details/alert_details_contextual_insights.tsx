/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import dedent from 'dedent';
import { useKibana } from '../../utils/kibana_react';
import { AlertData } from '../../hooks/use_fetch_alert_detail';

export function AlertDetailContextualInsights({ alert }: { alert: AlertData | null }) {
  const {
    services: { observabilityAIAssistant },
  } = useKibana();

  const ObservabilityAIAssistantContextualInsight =
    observabilityAIAssistant?.ObservabilityAIAssistantContextualInsight;

  const messages = useMemo(() => {
    if (!observabilityAIAssistant) {
      return null;
    }

    return observabilityAIAssistant.getContextualInsightMessages({
      message: `I'm looking at an alert and trying to understand why it was triggered`,
      instructions: dedent(
        `I'm an SRE. I am looking at an alert that was triggered. I want to understand why it was triggered, what it means, and what I should do next.`
      ),
    });
  }, [observabilityAIAssistant]);

  if (!ObservabilityAIAssistantContextualInsight || !messages) {
    return null;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <ObservabilityAIAssistantContextualInsight
          title={i18n.translate(
            'xpack.observability.alertDetailContextualInsights.InsightButtonLabel',
            { defaultMessage: 'Help me understand this alert' }
          )}
          messages={messages}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
