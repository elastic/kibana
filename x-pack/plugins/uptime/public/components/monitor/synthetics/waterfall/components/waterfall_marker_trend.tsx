/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useUptimeStartPlugins } from '../../../../../contexts/uptime_startup_plugins_context';
import { useUptimeSettingsContext } from '../../../../../contexts/uptime_settings_context';
import { AllSeries, createExploratoryViewUrl } from '../../../../../../../observability/public';
import { euiStyled } from '../../../../../../../../../src/plugins/kibana_react/common';
import { useWaterfallContext } from '../context/waterfall_chart';

export function WaterfallMarkerTrend({ title, field }: { title: string; field: string }) {
  const { observability } = useUptimeStartPlugins();

  const EmbeddableExpVIew = observability!.ExploratoryViewEmbeddable;

  const { basePath } = useUptimeSettingsContext();

  const { stepName } = useWaterfallContext();

  const allSeries: AllSeries = [
    {
      name: `${title}(${stepName})`,
      selectedMetricField: field,
      time: { from: 'now-1d', to: 'now' },
      seriesType: 'area',
      dataType: 'synthetics',
      reportDefinitions: {
        'monitor.name': ['ALL_VALUES'],
        'synthetics.step.name.keyword': [stepName],
      },
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
      <EmbeddableExpVIew
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
      />
    </Wrapper>
  );
}

export const EXPLORE_LABEL = i18n.translate('xpack.uptime.synthetics.markers.explore', {
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
