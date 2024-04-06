/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { pick, orderBy } from 'lodash';
import { GetSLOResponse, kqlWithFiltersSchema } from '@kbn/slo-schema';
import React, { useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle } from '@elastic/eui';
import moment from 'moment';
import { DataView } from '@kbn/data-views-plugin/common';
import {
  LOG_RATE_ANALYSIS_TYPE,
  type LogRateAnalysisType,
} from '@kbn/aiops-log-rate-analysis/log_rate_analysis_type';
import { LogRateAnalysisContent, type LogRateAnalysisResultsData } from '@kbn/aiops-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { ALERT_END } from '@kbn/rule-data-utils';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { useFetchDataViews } from '@kbn/observability-plugin/public';
import { colorTransformer, Color } from '@kbn/observability-shared-plugin/common';
import { BurnRateAlert, BurnRateRule } from '../../../alert_details_app_section';
import { useKibana } from '../../../../../../../utils/kibana_react';
import { getESQueryForLogRateAnalysis } from './helpers/log_rate_analysis_query';
interface Props {
  slo: GetSLOResponse;
  alert: BurnRateAlert;
  rule: BurnRateRule;
}

interface SignificantFieldValue {
  field: string;
  value: string | number;
  docCount: number;
  pValue: number | null;
}

export function LogRateAnalysisPanel({ slo, alert, rule }: Props) {
  const services = useKibana().services;
  const { dataViews: dataViewsService } = services;

  const [dataView, setDataView] = useState<DataView | undefined>();
  const [esSearchQuery, setEsSearchQuery] = useState<QueryDslQueryContainer | undefined>();
  const [logRateAnalysisParams, setLogRateAnalysisParams] = useState<
    | { logRateAnalysisType: LogRateAnalysisType; significantFieldValues: SignificantFieldValue[] }
    | undefined
  >();
  const params = slo.indicator.params;
  const { index } = params;
  const { data: dataViews = [] } = useFetchDataViews();

  useEffect(() => {
    const getDataView = async () => {
      const getDataViewByIndexPattern = (indexPattern: string) =>
        dataViews.find((dataView0) => dataView0.title === indexPattern);

      const dataViewId = getDataViewByIndexPattern(index)?.id;
      if (dataViewId) {
        const sloDataView = await dataViewsService.get(dataViewId);
        setDataView(sloDataView);
        getQuery();
      }
    };
    const getQuery = () => {
      const esSearchRequest = getESQueryForLogRateAnalysis(params) as QueryDslQueryContainer;
      console.log(esSearchRequest, '!!esSearchRequest');
      if (esSearchRequest) {
        setEsSearchQuery(esSearchRequest);
      }
    };
    getDataView();
  }, [index, dataViews, params, dataViewsService]);

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
  console.log(lookbackDuration, '!!lookbackDuration');
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

  return (
    <EuiPanel hasBorder={true} data-test-subj="logRateAnalysisBurnRateAlertDetails">
      <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h2>
              <FormattedMessage
                id="xpack.slo.burnRate.alertDetails.logRateAnalysis.sectionTitle"
                defaultMessage="Log Rate Analysis"
              />
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <LogRateAnalysisContent
            embeddingOrigin="observability_slo_burn_rate_alert_details"
            dataView={dataView} // TODO: fix dataview
            esSearchQuery={esSearchQuery}
            timeRange={timeRange}
            initialAnalysisStart={initialAnalysisStart}
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
    </EuiPanel>
  );
}
