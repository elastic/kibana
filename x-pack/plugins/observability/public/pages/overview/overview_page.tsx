/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React, { useState, useEffect } from 'react';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { ObservabilityPublicPluginsStart, useTrackPageview } from '../..';
import { DatePicker } from '../../components/shared/date_picker';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useHasData } from '../../hooks/use_has_data';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useTimeRange } from '../../hooks/use_time_range';
import { RouteParams } from '../../routes';
import { getNoDataConfig } from '../../utils/no_data_config';
import { OverviewDashboard } from './dashboard';
import { LoadingObservability } from './loading_observability';
import { DataView } from '../../../../../../src/plugins/data/common';

interface Props {
  routeParams: RouteParams<'/overview'>;
}

function getLensAttributes(defaultDataView: DataView, color: string) {
  const dataLayer = {
    columnOrder: ['col1', 'col2'],
    columns: {
      col2: {
        dataType: 'number',
        isBucketed: false,
        label: 'Count of records',
        operationType: 'count',
        scale: 'ratio',
        sourceField: 'Records',
      },
      col1: {
        dataType: 'date',
        isBucketed: true,
        label: '@timestamp',
        operationType: 'date_histogram',
        params: { interval: 'auto' },
        scale: 'interval',
        sourceField: '@timestamp',
      },
    },
  };

  const xyConfig = {
    axisTitlesVisibilitySettings: { x: true, yLeft: true, yRight: true },
    fittingFunction: 'None',
    gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
    layers: [
      {
        accessors: ['col2'],
        layerId: 'layer1',
        layerType: 'data',
        seriesType: 'bar_stacked',
        xAccessor: 'col1',
        yConfig: [{ forAccessor: 'col2', color }],
      },
    ],
    legend: { isVisible: true, position: 'right' },
    preferredSeriesType: 'bar_stacked',
    tickLabelsVisibilitySettings: { x: true, yLeft: true, yRight: true },
    valueLabels: 'hide',
  };

  return {
    visualizationType: 'lnsXY',
    title: 'Log rate',
    references: [
      {
        id: defaultDataView.id!,
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: defaultDataView.id!,
        name: 'indexpattern-datasource-layer-layer1',
        type: 'index-pattern',
      },
    ],
    state: {
      datasourceStates: {
        indexpattern: {
          layers: {
            layer1: dataLayer,
          },
        },
      },
      filters: [],
      query: { language: 'kuery', query: '' },
      visualization: xyConfig,
    },
  };
}

export function OverviewPage({ routeParams }: Props) {
  const { services } = useKibana<ObservabilityPublicPluginsStart>();

  const [defaultDataView, setDefaultDataView] = useState<DataView | null>(null);

  useEffect(() => {
    (async () => {
      const dw = await services.data.dataViews.getDefault();
      setDefaultDataView(dw);
    })();
  }, [services]);

  useTrackPageview({ app: 'observability-overview', path: 'overview' });
  useTrackPageview({ app: 'observability-overview', path: 'overview', delay: 15000 });
  useBreadcrumbs([
    {
      text: i18n.translate('xpack.observability.breadcrumbs.overviewLinkText', {
        defaultMessage: 'Overview',
      }),
    },
  ]);

  const { core, ObservabilityPageTemplate } = usePluginContext();

  const { relativeStart, relativeEnd } = useTimeRange();

  const relativeTime = { from: relativeStart, to: relativeEnd };

  const { hasAnyData, isAllRequestsComplete } = useHasData();

  if (hasAnyData === undefined) {
    return <LoadingObservability />;
  }

  const hasData = hasAnyData === true || (isAllRequestsComplete === false ? undefined : false);

  const noDataConfig = getNoDataConfig({
    hasData,
    basePath: core.http.basePath,
    docsLink: core.docLinks.links.observability.guide,
  });

  const { refreshInterval = 10000, refreshPaused = true } = routeParams.query;

  return (
    <ObservabilityPageTemplate
      noDataConfig={noDataConfig}
      pageHeader={
        hasData
          ? {
              pageTitle: overviewPageTitle,
              rightSideItems: [
                <DatePicker
                  rangeFrom={relativeTime.from}
                  rangeTo={relativeTime.to}
                  refreshInterval={refreshInterval}
                  refreshPaused={refreshPaused}
                />,
              ],
            }
          : undefined
      }
    >
      {hasData && (
        <OverviewDashboard
          timeRange={relativeTime}
          refreshConfig={{ pause: refreshPaused, value: refreshInterval }}
        />
      )}
      {/* {hasData && defaultDataView ? (
        <DashboardContainerByValueRenderer
          input={{
            id: 'random-id',
            title: 'Observability overview',

            viewMode: ViewMode.VIEW,
            isFullScreenMode: false,
            useMargins: false,

            timeRange: relativeTime,
            refreshConfig: {
              pause: refreshPaused,
              value: refreshInterval,
            },

            query: {
              query: '',
              language: 'lucene',
            },
            filters: [],

            panels: {
              '1': {
                gridData: {
                  w: 20,
                  h: 20,
                  x: 0,
                  y: 0,
                  i: '1',
                },
                type: 'lens',
                explicitInput: {
                  id: '1',
                  attributes: getLensAttributes(defaultDataView, 'red'),
                },
              },
            },
          }}
        />
      ) : (
        <div>No data</div>
      )} */}
    </ObservabilityPageTemplate>
  );
}

const overviewPageTitle = i18n.translate('xpack.observability.overview.pageTitle', {
  defaultMessage: 'Overview',
});
