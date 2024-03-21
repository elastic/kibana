/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { pick } from 'lodash';
import { GetSLOResponse } from '@kbn/slo-schema';
import React, { useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle } from '@elastic/eui';
import moment from 'moment';
import { DataView } from '@kbn/data-views-plugin/common';
import {
  LOG_RATE_ANALYSIS_TYPE,
  type LogRateAnalysisType,
} from '@kbn/aiops-utils/log_rate_analysis_type';
import { LogRateAnalysisContent, type LogRateAnalysisResultsData } from '@kbn/aiops-plugin/public';
import { TopAlert } from '@kbn/observability-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { ALERT_END } from '@kbn/rule-data-utils';
import { BurnRateAlert, BurnRateRule } from '../../../alert_details_app_section';
import { useKibana } from '../../../../../../../utils/kibana_react';

interface Props {
  slo: GetSLOResponse;
  alert: BurnRateAlert;
  rule: BurnRateRule;
}

export function LogRateAnalysisPanel({ slo, alert, rule }: Props) {
  const services = useKibana().services;
  const { dataViews } = services;
  const [dataView, setDataView] = useState<DataView | undefined>();

  const { index, filter, good, timestampField } = slo.indicator.params;

  useEffect(() => {
    const getDataView = async () => {
      const kqlDataView = await dataViews.get(index);
      console.log(kqlDataView, '!!kqlDataView');
      setDataView(kqlDataView);
    };
    getDataView();
  }, [index, dataViews]);

  const alertStart = moment(alert.start);
  const alertEnd = alert.fields[ALERT_END] ? moment(alert.fields[ALERT_END]) : undefined;

  const timeRange = {
    min: alertStart.clone().subtract(20, 'minutes'),
    max: alertEnd ? alertEnd.clone().add(5, 'minutes') : moment(new Date()),
  };

  const initialAnalysisStart = {
    baselineMin: alertStart.clone().subtract(10, 'minutes').valueOf(),
    baselineMax: alertStart.clone().subtract(1, 'minutes').valueOf(),
    deviationMin: alertStart.valueOf(),
    deviationMax: alertStart.clone().add(10, 'minutes').isAfter(moment(new Date()))
      ? moment(new Date()).valueOf()
      : alertStart.clone().add(10, 'minutes').valueOf(),
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
            dataView={dataView}
            timeRange={timeRange}
            initialAnalysisStart={initialAnalysisStart}
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
