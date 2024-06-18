/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { WidgetRenderAPI } from '@kbn/investigate-plugin/public';
import moment from 'moment';
import React from 'react';
import useAsync from 'react-use/lib/useAsync';
import { AlertLogRateAnalysis } from '../../components/alert_log_rate_analysis';
import { useFetchAlertDetail } from '../../hooks/use_fetch_alert_detail';
import { useKibana } from '../../hooks/use_kibana';

export function InvestigateAlertsLogRateAnalysis({
  alertUuid,
  query,
  indexPattern,
}: { alertUuid: string; query: QueryDslQueryContainer; indexPattern: string } & Pick<
  WidgetRenderAPI,
  'blocks' | 'onWidgetAdd'
>) {
  const [, alert] = useFetchAlertDetail(alertUuid);

  const { dataViews } = useKibana();

  const dataView = useAsync(() => {
    return dataViews.create({
      allowHidden: true,
      allowNoIndex: true,
      title: indexPattern,
      timeFieldName: '@timestamp',
    });
  }, []);

  if (!alert || !dataView.value) {
    return null;
  }

  const fields = alert.formatted.fields;

  const lookback =
    fields['kibana.alert.rule.parameters'] &&
    fields['kibana.alert.rule.parameters'].timeSize &&
    fields['kibana.alert.rule.parameters'].timeUnit
      ? moment.duration(
          fields['kibana.alert.rule.parameters'].timeSize as number,
          fields['kibana.alert.rule.parameters'].timeUnit as any
        )
      : moment.duration(1, 'm');

  return (
    <AlertLogRateAnalysis
      alert={alert.formatted}
      dataView={dataView.value}
      lookbackSize={lookback.asMinutes()}
      lookbackUnit={'m'}
      onAnalysisCompleted={() => {}}
      origin="investigate_view"
      query={query}
    />
  );
}
