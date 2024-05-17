/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  mlTimefilterRefresh$,
  useRefreshIntervalUpdates,
  useTimefilter,
} from '@kbn/ml-date-picker';
import { dynamic } from '@kbn/shared-ux-utility';
import type { FC } from 'react';
import React, { useEffect, useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { DEFAULT_REFRESH_INTERVAL_MS } from '../../../../common/constants/jobs_list';
import { ML_PAGES } from '../../../locator';
import type { NavigateToPath } from '../../contexts/kibana';
import { MlAnnotationUpdatesContext } from '../../contexts/ml/ml_annotation_updates_context';
import { AnnotationUpdatesService } from '../../services/annotations_service';
import { getBreadcrumbWithUrlForApp } from '../breadcrumbs';
import { basicResolvers } from '../resolvers';
import type { MlRoute } from '../router';
import { PageLoader, createPath } from '../router';
import { useRouteResolver } from '../use_resolver';

const JobsPage = dynamic(async () => ({
  default: (await import('../../jobs/jobs_list')).JobsPage,
}));

export const jobListRouteFactory = (navigateToPath: NavigateToPath, basePath: string): MlRoute => ({
  id: 'anomaly_detection',
  title: i18n.translate('xpack.ml.anomalyDetection.jobs.docTitle', {
    defaultMessage: 'Anomaly Detection Jobs',
  }),
  path: createPath(ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE),
  render: () => <PageWrapper />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('ANOMALY_DETECTION_BREADCRUMB', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.anomalyDetection.jobsManagementLabel', {
        defaultMessage: 'Jobs',
      }),
    },
  ],
  'data-test-subj': 'mlPageJobManagement',
  enableDatePicker: true,
});

const PageWrapper: FC = () => {
  const { context } = useRouteResolver('full', ['canGetJobs'], basicResolvers());

  const timefilter = useTimefilter({ timeRangeSelector: false, autoRefreshSelector: true });

  const refresh = useRefreshIntervalUpdates();

  const mlTimefilterRefresh = useObservable(mlTimefilterRefresh$);
  const lastRefresh = mlTimefilterRefresh?.lastRefresh ?? 0;

  const refreshValue = refresh.value ?? 0;
  const refreshPause = refresh.pause ?? true;

  useEffect(() => {
    const refreshInterval =
      refreshValue === 0 || refreshPause === true
        ? { pause: false, value: DEFAULT_REFRESH_INTERVAL_MS }
        : { pause: refreshPause, value: refreshValue };
    timefilter.setRefreshInterval(refreshInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const annotationUpdatesService = useMemo(() => new AnnotationUpdatesService(), []);

  return (
    <PageLoader context={context}>
      <MlAnnotationUpdatesContext.Provider value={annotationUpdatesService}>
        <JobsPage lastRefresh={lastRefresh} />
      </MlAnnotationUpdatesContext.Provider>
    </PageLoader>
  );
};
