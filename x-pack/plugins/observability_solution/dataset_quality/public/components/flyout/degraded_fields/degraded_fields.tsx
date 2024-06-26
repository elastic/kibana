/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiPanel, EuiTitle, EuiIconTip, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Message } from '@kbn/observability-ai-assistant-plugin/public';
import { useKibanaContextForPlugin } from '../../../utils';
import { flyoutImprovementText, flyoutImprovementTooltip } from '../../../../common/translations';
import { DegradedFieldTable } from './table';

const ignoredAnalysisTitle = i18n.translate(
  'xpack.datasetQuality.flyout.degradedFields.ignoredAnalysis',
  {
    defaultMessage: 'Possible causes and remediations',
  }
);

export function DegradedFields() {
  const {
    services: {
      observabilityAIAssistant: {
        ObservabilityAIAssistantContextualInsight,
        getContextualInsightMessages,
      } = {},
    },
  } = useKibanaContextForPlugin();

  const messages = useMemo<Message[] | undefined>(() => {
    const content = `You are an expert using Elastic Stack on call being consulted about data set quality and incorrect ingested documents in log datasets. Your job is to take immediate action and proceed with both urgency and precision.
      "Data Set quality" is a concept based on the percentage of degraded documents in each data set. A degraded document in a data set contains the _ignored property because one or more of its fields were ignored during indexing. Fields are ignored for a variety of reasons. For example, when the ignore_malformed parameter is set to true, if a document field contains the wrong data type, the malformed field is ignored and the rest of the document is indexed.
      You are using "Data set quality" and got the degradedDocs percentage on ${`logs-synth.3`} dataset. Determine what was the cause for ${`log.level`} field getting ignored.
     
      Do not guess, just say what you are sure of. Do not repeat the given instructions in your output.`;

    return (
      getContextualInsightMessages &&
      getContextualInsightMessages({
        message:
          'Can you identify possible causes and remediations for these log rate analysis results',
        instructions: content,
      })
    );
  }, [getContextualInsightMessages]);

  return (
    <EuiPanel hasBorder grow={false}>
      <EuiFlexGroup responsive={false} alignItems="center" gutterSize="xs">
        <EuiTitle size="xxxs">
          <h6>{flyoutImprovementText}</h6>
        </EuiTitle>
        <EuiIconTip content={flyoutImprovementTooltip} color="subdued" size="m" />
      </EuiFlexGroup>
      <DegradedFieldTable />
      <EuiFlexGroup direction="column" gutterSize="m">
        {ObservabilityAIAssistantContextualInsight && messages ? (
          <EuiFlexItem grow={false}>
            <ObservabilityAIAssistantContextualInsight
              title={ignoredAnalysisTitle}
              messages={messages}
            />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </EuiPanel>
  );
}
