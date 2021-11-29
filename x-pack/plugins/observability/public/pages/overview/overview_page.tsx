/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useTrackPageview } from '../..';
import { DatePicker } from '../../components/shared/date_picker';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useHasData } from '../../hooks/use_has_data';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useTimeRange } from '../../hooks/use_time_range';
import { RouteParams } from '../../routes';
import { getNoDataConfig } from '../../utils/no_data_config';
import { LoadingObservability } from './loading_observability';

interface Props {
  routeParams: RouteParams<'/overview'>;
}

export function OverviewPage({ routeParams }: Props) {
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

  const relativeTime = { start: relativeStart, end: relativeEnd };

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
                  rangeFrom={relativeTime.start}
                  rangeTo={relativeTime.end}
                  refreshInterval={refreshInterval}
                  refreshPaused={refreshPaused}
                />,
              ],
            }
          : undefined
      }
    >
      {hasData && <div>New observability content goes here</div>}
    </ObservabilityPageTemplate>
  );
}

const overviewPageTitle = i18n.translate('xpack.observability.overview.pageTitle', {
  defaultMessage: 'Overview',
});
