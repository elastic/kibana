/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useMemo, useState } from 'react';
import { pick, orderBy } from 'lodash';
import moment from 'moment';

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { DataView } from '@kbn/data-views-plugin/common';
import {
  LogRateAnalysisContent,
  LOG_RATE_ANALYSIS_TYPE,
  type LogRateAnalysisResultsData,
  type LogRateAnalysisType,
} from '@kbn/aiops-plugin/public';
import { Rule } from '@kbn/alerting-plugin/common';
import { CoPilotPrompt, TopAlert, useCoPilot } from '@kbn/observability-plugin/public';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { i18n } from '@kbn/i18n';
import { CoPilotPromptId } from '@kbn/observability-plugin/common';
import { ALERT_END } from '@kbn/rule-data-utils';
import { Color, colorTransformer } from '../../../../../../common/color_palette';
import { useKibanaContextForPlugin } from '../../../../../hooks/use_kibana';
import {
  Comparator,
  CountRuleParams,
  isRatioRuleParams,
  PartialRuleParams,
  ruleParamsRT,
} from '../../../../../../common/alerting/logs/log_threshold';
import { decodeOrThrow } from '../../../../../../common/runtime_types';
import { getESQueryForLogRateAnalysis } from '../log_rate_analysis_query';

export interface AlertDetailsLogRateAnalysisSectionProps {
  rule: Rule<PartialRuleParams>;
  alert: TopAlert<Record<string, any>>;
}

interface SignificantFieldValue {
  field: string;
  value: string | number;
  docCount: number;
  pValue: number | null;
}

export const LogRateAnalysis: FC<AlertDetailsLogRateAnalysisSectionProps> = ({ rule, alert }) => {
  const { services } = useKibanaContextForPlugin();
  const { dataViews, logsShared } = services;
  const [dataView, setDataView] = useState<DataView | undefined>();
  const [esSearchQuery, setEsSearchQuery] = useState<QueryDslQueryContainer | undefined>();
  const [logRateAnalysisParams, setLogRateAnalysisParams] = useState<
    { significantFieldValues: SignificantFieldValue[] } | undefined
  >();
  const [logRateAnalysisType, setLogRateAnalysisType] = useState<LogRateAnalysisType | undefined>(
    undefined
  );

  const validatedParams = useMemo(() => decodeOrThrow(ruleParamsRT)(rule.params), [rule]);

  useEffect(() => {
    const getDataView = async () => {
      const { timestampField, dataViewReference } =
        await logsShared.logViews.client.getResolvedLogView(validatedParams.logView);

      if (dataViewReference.id) {
        const logDataView = await dataViews.get(dataViewReference.id);
        setDataView(logDataView);
        getQuery(timestampField);
      }
    };

    const getQuery = (timestampField: string) => {
      const esSearchRequest = getESQueryForLogRateAnalysis(
        validatedParams as CountRuleParams,
        timestampField,
        alert,
        validatedParams.groupBy
      ) as QueryDslQueryContainer;

      if (esSearchRequest) {
        setEsSearchQuery(esSearchRequest);
      }
    };

    if (!isRatioRuleParams(validatedParams)) {
      getDataView();

      switch (validatedParams.count.comparator) {
        case Comparator.GT:
        case Comparator.GT_OR_EQ:
          setLogRateAnalysisType(LOG_RATE_ANALYSIS_TYPE.SPIKE);
          break;
        case Comparator.LT:
        case Comparator.LT_OR_EQ:
          setLogRateAnalysisType(LOG_RATE_ANALYSIS_TYPE.DROP);
          break;
        default:
          setLogRateAnalysisType(undefined);
      }
    }
  }, [validatedParams, alert, dataViews, logsShared]);

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

  function getDeviationMax() {
    if (alertEnd) {
      return alertEnd
        .clone()
        .subtract(1 * intervalFactor, 'minutes')
        .valueOf();
    } else if (
      alertStart
        .clone()
        .add(10 * intervalFactor, 'minutes')
        .isAfter(moment(new Date()))
    ) {
      return moment(new Date()).valueOf();
    } else {
      return alertStart
        .clone()
        .add(10 * intervalFactor, 'minutes')
        .valueOf();
    }
  }

  const initialAnalysisStart = {
    baselineMin: alertStart
      .clone()
      .subtract(13 * intervalFactor, 'minutes')
      .valueOf(),
    baselineMax: alertStart
      .clone()
      .subtract(2 * intervalFactor, 'minutes')
      .valueOf(),
    deviationMin: alertStart
      .clone()
      .subtract(1 * intervalFactor, 'minutes')
      .valueOf(),
    deviationMax: getDeviationMax(),
  };

  const logRateAnalysisTitle = i18n.translate(
    'xpack.infra.logs.alertDetails.logRateAnalysisTitle',
    {
      defaultMessage: 'Possible causes and remediations',
    }
  );

  const onAnalysisCompleted = (analysisResults: LogRateAnalysisResultsData | undefined) => {
    const significantFieldValues = orderBy(
      analysisResults?.significantTerms?.map((item) => ({
        field: item.fieldName,
        value: item.fieldValue,
        docCount: item.doc_count,
        pValue: item.pValue,
      })),
      ['pValue', 'docCount'],
      ['asc', 'asc']
    ).slice(0, 50);
    setLogRateAnalysisParams(significantFieldValues ? { significantFieldValues } : undefined);
  };

  const coPilotService = useCoPilot();
  const hasLogRateAnalysisParams =
    logRateAnalysisParams && logRateAnalysisParams.significantFieldValues?.length > 0;

  if (!dataView || !esSearchQuery) return null;

  return (
    <EuiPanel hasBorder={true} data-test-subj="logRateAnalysisAlertDetails">
      <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h2>
              <FormattedMessage
                id="xpack.infra.logs.alertDetails.logRateAnalysis.sectionTitle"
                defaultMessage="Log Rate Analysis"
              />
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <LogRateAnalysisContent
            dataView={dataView}
            analysisType={logRateAnalysisType}
            timeRange={timeRange}
            esSearchQuery={esSearchQuery}
            initialAnalysisStart={initialAnalysisStart}
            barColorOverride={colorTransformer(Color.color0)}
            barHighlightColorOverride={colorTransformer(Color.color1)}
            onAnalysisCompleted={onAnalysisCompleted}
            appDependencies={pick(services, [
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
            ])}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup direction="column" gutterSize="m">
        {coPilotService?.isEnabled() && hasLogRateAnalysisParams ? (
          <EuiFlexItem grow={false}>
            <CoPilotPrompt
              coPilot={coPilotService}
              title={logRateAnalysisTitle}
              params={logRateAnalysisParams}
              promptId={CoPilotPromptId.LogRateAnalysis}
              feedbackEnabled={false}
            />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
