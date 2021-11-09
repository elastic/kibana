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
import { useKibana } from '../../../../../../../../../src/plugins/kibana_react/public';
import { useUptimeStartPlugins } from '../../../../../contexts/uptime_startup_plugins_context';
import { AllSeries, createExploratoryViewUrl } from '../../../../../../../observability/public';
import { euiStyled } from '../../../../../../../../../src/plugins/kibana_react/common';
import { useWaterfallContext } from '../context/waterfall_chart';
import { JourneyStep } from '../../../../../../common/runtime_types';

const getLast48Intervals = (activeStep: JourneyStep) => {
  const { lt, gte } = activeStep.monitor.timespan!;
  const inDays = moment(lt).diff(moment(gte), 'days');
  if (inDays > 0) {
    return { to: 'now', from: `now-${inDays * 48}d` };
  }

  const inHours = moment(lt).diff(moment(gte), 'hours');
  if (inHours > 0) {
    return { to: 'now', from: `now-${inHours * 48}h` };
  }

  const inMinutes = moment(lt).diff(moment(gte), 'minutes');
  if (inMinutes > 0) {
    return { to: 'now', from: `now-${inMinutes * 48}m` };
  }

  const inSeconds = moment(lt).diff(moment(gte), 'seconds');
  return { to: 'now', from: `now-${inSeconds * 48}s` };
};

export function WaterfallMarkerTrend({ title, field }: { title: string; field: string }) {
  const { observability } = useUptimeStartPlugins();

  const EmbeddableExpView = observability!.ExploratoryViewEmbeddable;

  const basePath = useKibana().services.http?.basePath?.get();

  const { activeStep } = useWaterfallContext();

  if (!activeStep) {
    return null;
  }

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
