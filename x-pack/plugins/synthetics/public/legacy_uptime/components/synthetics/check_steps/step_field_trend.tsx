/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { useSelector } from 'react-redux';
import { AllSeries, createExploratoryViewUrl } from '@kbn/observability-plugin/public';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { JourneyStep } from '../../../../../common/runtime_types';
import { useUptimeStartPlugins } from '../../../contexts/uptime_startup_plugins_context';
import { selectDynamicSettings } from '../../../state/selectors';

export const getLast48Intervals = (activeStep: JourneyStep) => {
  const timestamp = activeStep['@timestamp'];
  const { lt, gte } = activeStep.monitor.timespan!;
  const difference = moment(lt).diff(moment(gte), 'millisecond') * 48;

  return {
    to: timestamp,
    from: moment(timestamp).subtract(difference, 'millisecond').toISOString(),
  };
};

export function StepFieldTrend({
  title,
  field,
  step: activeStep,
}: {
  title: string;
  field: string;
  step: JourneyStep;
}) {
  const { observability } = useUptimeStartPlugins();

  const indexSettings = useSelector(selectDynamicSettings);

  const EmbeddableExpView = observability!.ExploratoryViewEmbeddable;

  const basePath = useKibana().services.http?.basePath?.get();

  const allSeries: AllSeries = [
    {
      name: `${title}(${activeStep.synthetics.step?.name!})`,
      selectedMetricField: field,
      time: getLast48Intervals(activeStep),
      seriesType: 'area',
      dataType: 'synthetics',
      reportDefinitions: {
        'monitor.name': [activeStep.monitor.name!],
        'synthetics.step.name.keyword': [activeStep.synthetics.step?.name!],
      },
      operationType: 'last_value',
    },
  ];

  const href = createExploratoryViewUrl(
    {
      reportType: 'kpi-over-time',
      allSeries,
    },
    basePath
  );

  return (
    <Wrapper>
      <EmbeddableExpView
        title={title}
        appendTitle={
          <EuiButton iconType={'visArea'} href={href} target="_blank" size="s">
            {EXPLORE_LABEL}
          </EuiButton>
        }
        reportType={'kpi-over-time'}
        attributes={allSeries}
        axisTitlesVisibility={{ x: false, yLeft: false, yRight: false }}
        legendIsVisible={false}
        dataTypesIndexPatterns={
          indexSettings.settings?.heartbeatIndices
            ? {
                synthetics: indexSettings.settings?.heartbeatIndices,
              }
            : undefined
        }
        withActions={false}
      />
    </Wrapper>
  );
}

export const EXPLORE_LABEL = i18n.translate('xpack.synthetics.synthetics.markers.explore', {
  defaultMessage: 'Explore',
});

const Wrapper = euiStyled.div`
  height: 200px;
  width: 400px;
  &&& {
    .expExpressionRenderer__expression {
      padding-bottom: 0 !important;
    }
  }
`;
