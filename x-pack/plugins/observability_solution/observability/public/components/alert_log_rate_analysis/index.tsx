/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { LogRateAnalysisContent, LogRateAnalysisResultsData } from '@kbn/aiops-plugin/public';
import { DataView } from '@kbn/data-views-plugin/common';
import moment from 'moment';
import { useMemo } from 'react';
import { ALERT_END } from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import { euiPaletteColorBlind } from '@elastic/eui';
import { pick } from 'lodash';
import { TopAlert } from '../../typings/alerts';
import { useKibana } from '../../utils/kibana_react';
import { getInitialAnalysisStart, getTimeRangeEnd } from './get_initial_analysis_start';
import { TimeUnitChar } from '../../../common';

const palette = euiPaletteColorBlind();

const BAR_COLOR_OVERRIDE = palette[1]; // (blue)
const BAR_HIGHLIGHT_COLOR_OVERRIDE = palette[2]; // pink

export function AlertLogRateAnalysis({
  origin,
  dataView,
  alert,
  lookbackSize,
  lookbackUnit,
  onAnalysisCompleted,
  query,
}: {
  origin: string;
  dataView: DataView;
  alert: TopAlert<{}>;
  lookbackSize: number;
  lookbackUnit: TimeUnitChar;
  onAnalysisCompleted: (data: LogRateAnalysisResultsData) => void;
  query: QueryDslQueryContainer;
}) {
  const { services } = useKibana();

  const timeRangeOptions = useMemo(() => {
    // Identify `intervalFactor` to adjust time ranges based on alert settings.
    // The default time ranges for `initialAnalysisStart` are suitable for a `1m` lookback.
    // If an alert would have a `5m` lookback, this would result in a factor of `5`.
    const lookbackDuration = moment.duration(lookbackSize, lookbackUnit);

    const intervalFactor = Math.max(1, lookbackDuration.asSeconds() / 60);

    const alertStart = moment(alert.start);
    const alertEnd = alert.fields[ALERT_END] ? moment(alert.fields[ALERT_END]) : undefined;

    const timeRange = {
      min: alertStart.clone().subtract(15 * intervalFactor, 'minutes'),
      max: getTimeRangeEnd({ alertStart, intervalFactor, alertEnd }),
    };

    return {
      alertStart,
      alertEnd,
      timeRange,
      intervalFactor,
    };
  }, [alert, lookbackSize, lookbackUnit]);

  return (
    <LogRateAnalysisContent
      embeddingOrigin={origin}
      dataView={dataView}
      timeRange={timeRangeOptions.timeRange}
      esSearchQuery={query}
      initialAnalysisStart={getInitialAnalysisStart(timeRangeOptions)}
      barColorOverride={BAR_COLOR_OVERRIDE}
      barHighlightColorOverride={BAR_HIGHLIGHT_COLOR_OVERRIDE}
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
  );
}
