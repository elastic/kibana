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
} from '@kbn/aiops-utils/log_rate_analysis_type';
import { LogRateAnalysisContent, type LogRateAnalysisResultsData } from '@kbn/aiops-plugin/public';
import { TopAlert } from '@kbn/observability-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { ALERT_END } from '@kbn/rule-data-utils';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { buildEsQuery } from '@kbn/observability-plugin/public';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Filter } from '@kbn/es-query';
import { useFetchDataViews } from '@kbn/observability-plugin/public';
import { colorTransformer, Color } from '@kbn/observability-shared-plugin/common';
import { BurnRateAlert, BurnRateRule } from '../../../alert_details_app_section';
import { useKibana } from '../../../../../../../utils/kibana_react';
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

// TODO check the validity of the query & write some tests
const getESQueryForLogRateAnalysis = (params: {
  filter: string;
  good: string;
  total: string;
  timestampField: string;
}) => {
  const { filter, good, total, timestampField } = params;

  const filterKuery = kqlWithFiltersSchema.is(filter) ? filter.kqlQuery : filter;
  const filterFilters: Filter[] = [];

  if (kqlWithFiltersSchema.is(filter)) {
    filter.filters.forEach((i) => filterFilters.push(i));
  }
  const goodKuery = kqlWithFiltersSchema.is(good) ? good.kqlQuery : good;
  const goodFilters = kqlWithFiltersSchema.is(good) ? good.filters : [];
  const totalKuery = kqlWithFiltersSchema.is(total) ? total.kqlQuery : total;
  const totalFilters = kqlWithFiltersSchema.is(total) ? total.filters : [];
  const customGoodFilter = buildEsQuery({ kuery: goodKuery, filters: goodFilters });
  const customTotalFilter = buildEsQuery({ kuery: totalKuery, filters: totalFilters });
  const customFilters = buildEsQuery({ kuery: filterKuery, filters: filterFilters });

  // TODO add group by to the return result
  const finalQuery = {
    bool: { filter: [customTotalFilter, customFilters], must_not: customGoodFilter },
  };
  console.log(finalQuery, '!!finalQuery');
  return finalQuery;
};

export function LogRateAnalysisPanel({ slo, alert, rule }: Props) {
  const services = useKibana().services;
  const { dataViews: dataViewsService, data } = services;

  const [dataView, setDataView] = useState<DataView | undefined>();
  const [esSearchQuery, setEsSearchQuery] = useState<QueryDslQueryContainer | undefined>();
  const [logRateAnalysisParams, setLogRateAnalysisParams] = useState<
    | { logRateAnalysisType: LogRateAnalysisType; significantFieldValues: SignificantFieldValue[] }
    | undefined
  >();
  const params = slo.indicator.params;
  const { index, timestampField } = params;
  const { data: dataViews = [] } = useFetchDataViews();

  useEffect(() => {
    const getDataView = async () => {
      const getDataViewByIndexPattern = (indexPattern: string) =>
        dataViews.find((dataView0) => dataView0.title === indexPattern);

      const dataViewId = getDataViewByIndexPattern(index)?.id;
      if (dataViewId) {
        const sloDataView = await dataViewsService.get(dataViewId);
        setDataView(sloDataView);
      }
    };
    const getQuery = (timestampField?: string) => {
      const esSearchRequest = getESQueryForLogRateAnalysis(params) as QueryDslQueryContainer;
      console.log(esSearchRequest, '!!esSearchRequest');
      if (esSearchRequest) {
        setEsSearchQuery(esSearchRequest);
      }
    };
    getDataView();
    getQuery(); // TODO pass timestampField
  }, [index, dataViews, params, timestampField, dataViewsService]);

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
