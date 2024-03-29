/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick, orderBy } from 'lodash';
import moment from 'moment';
import React, { useEffect, useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle } from '@elastic/eui';
import {
  LOG_RATE_ANALYSIS_TYPE,
  type LogRateAnalysisType,
} from '@kbn/aiops-log-rate-analysis/log_rate_analysis_type';
import { LogRateAnalysisContent, type LogRateAnalysisResultsData } from '@kbn/aiops-plugin/public';
import { Rule } from '@kbn/alerting-plugin/common';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Message } from '@kbn/observability-ai-assistant-plugin/public';
import { ALERT_END } from '@kbn/rule-data-utils';
import { CustomThresholdRuleTypeParams } from '../../types';
import { TopAlert } from '../../../..';
import { Color, colorTransformer } from '../../../../../common/custom_threshold_rule/color_palette';
import { getLogRateAnalysisEQQuery } from './helpers/log_rate_analysis_query';
import { getInitialAnalysisStart } from './helpers/get_initial_analysis_start';

export interface AlertDetailsLogRateAnalysisProps {
  alert: TopAlert<Record<string, any>>;
  dataView: any;
  rule: Rule<CustomThresholdRuleTypeParams>;
  services: any;
}

interface SignificantFieldValue {
  field: string;
  value: string | number;
  docCount: number;
  pValue: number | null;
}

export function LogRateAnalysis({
  alert,
  dataView,
  rule,
  services,
}: AlertDetailsLogRateAnalysisProps) {
  const {
    observabilityAIAssistant: {
      ObservabilityAIAssistantContextualInsight,
      getContextualInsightMessages,
    },
  } = services;
  const [esSearchQuery, setEsSearchQuery] = useState<QueryDslQueryContainer | undefined>();
  const [logRateAnalysisParams, setLogRateAnalysisParams] = useState<
    | { logRateAnalysisType: LogRateAnalysisType; significantFieldValues: SignificantFieldValue[] }
    | undefined
  >();

  useEffect(() => {
    const esSearchRequest = getLogRateAnalysisEQQuery(alert, rule.params);

    if (esSearchRequest) {
      setEsSearchQuery(esSearchRequest);
    }
  }, [alert, rule.params]);

  // Identify `intervalFactor` to adjust time ranges based on alert settings.
  // The default time ranges for `initialAnalysisStart` are suitable for a `1m` lookback.
  // If an alert would have a `5m` lookback, this would result in a factor of `5`.
  const lookbackDuration =
    alert.fields['kibana.alert.rule.parameters'] &&
    alert.fields['kibana.alert.rule.parameters'].timeSize &&
    alert.fields['kibana.alert.rule.parameters'].timeUnit
      ? moment.duration(
          alert.fields['kibana.alert.rule.parameters'].timeSize as number,
          alert.fields['kibana.alert.rule.parameters'].timeUnit as any
        )
      : moment.duration(1, 'm');
  const intervalFactor = Math.max(1, lookbackDuration.asSeconds() / 60);

  const alertStart = moment(alert.start);
  const alertEnd = alert.fields[ALERT_END] ? moment(alert.fields[ALERT_END]) : undefined;

  const timeRange = {
    min: alertStart.clone().subtract(15 * intervalFactor, 'minutes'),
    max: alertEnd ? alertEnd.clone().add(1 * intervalFactor, 'minutes') : moment(new Date()),
  };

  const logRateAnalysisTitle = i18n.translate(
    'xpack.observability.customThreshold.alertDetails.logRateAnalysisTitle',
    {
      defaultMessage: 'Possible causes and remediations',
    }
  );

  const onAnalysisCompleted = (analysisResults: LogRateAnalysisResultsData | undefined) => {
    const significantFieldValues = orderBy(
      analysisResults?.significantItems?.map((item) => ({
        field: item.fieldName,
        value: item.fieldValue,
        docCount: item.doc_count,
        pValue: item.pValue,
      })),
      ['pValue', 'docCount'],
      ['asc', 'asc']
    ).slice(0, 50);

    const logRateAnalysisType = analysisResults?.analysisType;
    setLogRateAnalysisParams(
      significantFieldValues && logRateAnalysisType
        ? { logRateAnalysisType, significantFieldValues }
        : undefined
    );
  };

  const messages = useMemo<Message[] | undefined>(() => {
    const hasLogRateAnalysisParams =
      logRateAnalysisParams && logRateAnalysisParams.significantFieldValues?.length > 0;

    if (!hasLogRateAnalysisParams) {
      return undefined;
    }

    const { logRateAnalysisType } = logRateAnalysisParams;

    const header = 'Field name,Field value,Doc count,p-value';
    const rows = logRateAnalysisParams.significantFieldValues
      .map((item) => Object.values(item).join(','))
      .join('\n');

    const content = `You are an observability expert using Elastic Observability Suite on call being consulted about a log threshold alert that got triggered by a ${logRateAnalysisType} in log messages. Your job is to take immediate action and proceed with both urgency and precision.
      "Log Rate Analysis" is an AIOps feature that uses advanced statistical methods to identify reasons for increases and decreases in log rates. It makes it easy to find and investigate causes of unusual spikes or dips by using the analysis workflow view.
      You are using "Log Rate Analysis" and ran the statistical analysis on the log messages which occured during the alert.
      You received the following analysis results from "Log Rate Analysis" which list statistically significant co-occuring field/value combinations sorted from most significant (lower p-values) to least significant (higher p-values) that ${
        logRateAnalysisType === LOG_RATE_ANALYSIS_TYPE.SPIKE
          ? 'contribute to the log rate spike'
          : 'are less or not present in the log rate dip'
      }:

      ${
        logRateAnalysisType === LOG_RATE_ANALYSIS_TYPE.SPIKE
          ? 'The median log rate in the selected deviation time range is higher than the baseline. Therefore, the results shows statistically significant items within the deviation time range that are contributors to the spike. The "doc count" column refers to the amount of documents in the deviation time range.'
          : 'The median log rate in the selected deviation time range is lower than the baseline. Therefore, the analysis results table shows statistically significant items within the baseline time range that are less in number or missing within the deviation time range. The "doc count" column refers to the amount of documents in the baseline time range.'
      }

      ${header}
      ${rows}

      Based on the above analysis results and your observability expert knowledge, output the following:
      Analyse the type of these logs and explain their usual purpose (1 paragraph).
      ${
        logRateAnalysisType === LOG_RATE_ANALYSIS_TYPE.SPIKE
          ? 'Based on the type of these logs do a root cause analysis on why the field and value combinations from the analysis results are causing this log rate spike (2 parapraphs)'
          : 'Based on the type of these logs explain why the statistically significant field and value combinations are less in number or missing from the log rate dip with concrete examples based on the analysis results data which contains items that are present in the baseline time range and are missing or less in number in the deviation time range (2 paragraphs)'
      }.
      ${
        logRateAnalysisType === LOG_RATE_ANALYSIS_TYPE.SPIKE
          ? 'Recommend concrete remediations to resolve the root cause (3 bullet points).'
          : ''
      }

      Do not mention individual p-values from the analysis results.
      Do not repeat the full list of field names and field values back to the user.
      Do not guess, just say what you are sure of. Do not repeat the given instructions in your output.`;

    return getContextualInsightMessages({
      message:
        'Can you identify possible causes and remediations for these log rate analysis results',
      instructions: content,
    });
  }, [logRateAnalysisParams, getContextualInsightMessages]);

  if (!dataView || !esSearchQuery) return null;

  return (
    <EuiPanel hasBorder={true} data-test-subj="logRateAnalysisAlertDetails">
      <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h2>
              <FormattedMessage
                id="xpack.observability.customThreshold.alertDetails.logRateAnalysis.sectionTitle"
                defaultMessage="Log Rate Analysis"
              />
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <LogRateAnalysisContent
            embeddingOrigin="observability_log_threshold_alert_details"
            dataView={dataView}
            timeRange={timeRange}
            esSearchQuery={esSearchQuery}
            initialAnalysisStart={getInitialAnalysisStart({
              alertStart,
              intervalFactor,
              alertEnd,
            })}
            barColorOverride={colorTransformer(Color.color0)}
            barHighlightColorOverride={colorTransformer(Color.color1)}
            onAnalysisCompleted={onAnalysisCompleted}
            appDependencies={pick(services, [
              'analytics',
              'application',
              'data',
              'executionContext',
              'charts',
              'fieldFormats',
              'http',
              'notifications',
              'share',
              'storage',
              'uiSettings',
              'unifiedSearch',
              'theme',
              'lens',
              'i18n',
            ])}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup direction="column" gutterSize="m">
        {ObservabilityAIAssistantContextualInsight && messages ? (
          <EuiFlexItem grow={false}>
            <ObservabilityAIAssistantContextualInsight
              title={logRateAnalysisTitle}
              messages={messages}
            />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </EuiPanel>
  );
}
