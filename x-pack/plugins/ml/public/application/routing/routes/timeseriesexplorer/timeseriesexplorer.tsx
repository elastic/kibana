/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { dynamic } from '@kbn/shared-ux-utility';
import { ML_PAGES } from '../../../../locator';
import type { NavigateToPath } from '../../../contexts/kibana';
import { useMlApiContext, useUiSettings } from '../../../contexts/kibana';
import { getDateFormatTz } from '../../../explorer/explorer_utils';
import { mlJobService } from '../../../services/job_service';
import type { MlRoute, PageProps } from '../../router';
import { createPath, PageLoader } from '../../router';
import { useRouteResolver } from '../../use_resolver';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';
import { AnnotationUpdatesService } from '../../../services/annotations_service';
import { MlAnnotationUpdatesContext } from '../../../contexts/ml/ml_annotation_updates_context';
import { basicResolvers } from '../../resolvers';

const TimeSeriesExplorerUrlStateManager = dynamic(async () => ({
  default: (await import('./state_manager')).TimeSeriesExplorerUrlStateManager,
}));

export const timeSeriesExplorerRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  id: 'timeseriesexplorer',
  path: createPath(ML_PAGES.SINGLE_METRIC_VIEWER),
  title: i18n.translate('xpack.ml.anomalyDetection.singleMetricViewerLabel', {
    defaultMessage: 'Single Metric Viewer',
  }),
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('ANOMALY_DETECTION_BREADCRUMB', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.anomalyDetection.singleMetricViewerLabel', {
        defaultMessage: 'Single Metric Viewer',
      }),
    },
  ],
  enableDatePicker: true,
});

const PageWrapper: FC<PageProps> = ({ deps }) => {
  const mlApi = useMlApiContext();
  const uiSettings = useUiSettings();
  const { context, results } = useRouteResolver('full', ['canGetJobs'], {
    ...basicResolvers(),
    jobs: mlJobService.loadJobsWrapper,
    jobsWithTimeRange: () => mlApi.jobs.jobsWithTimerange(getDateFormatTz()),
  });

  const annotationUpdatesService = useMemo(() => new AnnotationUpdatesService(), []);

  return (
    <PageLoader context={context}>
      <MlAnnotationUpdatesContext.Provider value={annotationUpdatesService}>
        {results ? (
          <TimeSeriesExplorerUrlStateManager
            config={uiSettings}
            jobsWithTimeRange={results.jobsWithTimeRange.jobs}
          />
        ) : null}
      </MlAnnotationUpdatesContext.Provider>
    </PageLoader>
  );
};
