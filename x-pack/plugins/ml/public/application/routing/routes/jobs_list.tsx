/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { FC } from 'react';
import React, { useEffect, useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { DEFAULT_REFRESH_INTERVAL_MS } from '../../../../common/constants/jobs_list';
import type { NavigateToPath } from '../../contexts/kibana/use_navigate_to_path';
import { useTimefilter } from '../../contexts/kibana/use_timefilter';
import { MlAnnotationUpdatesContext } from '../../contexts/ml/ml_annotation_updates_context';
import { JobsPage } from '../../jobs/jobs_list/jobs';
import { AnnotationUpdatesService } from '../../services/annotations_service';
import { mlTimefilterRefresh$ } from '../../services/timefilter_refresh_service';
import { useUrlState } from '../../util/url_state';
import { getBreadcrumbWithUrlForApp } from '../breadcrumbs';
import { basicResolvers } from '../resolvers';
import type { MlRoute, PageProps } from '../router';
import { PageLoader } from '../router';
import { useResolver } from '../use_resolver';

export const jobListRouteFactory = (navigateToPath: NavigateToPath, basePath: string): MlRoute => ({
  path: '/jobs',
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('ANOMALY_DETECTION_BREADCRUMB', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.anomalyDetection.jobManagementLabel', {
        defaultMessage: 'Job Management',
      }),
      href: '',
    },
  ],
});

const PageWrapper: FC<PageProps> = ({ deps }) => {
  const { context } = useResolver(undefined, undefined, deps.config, basicResolvers(deps));
  const timefilter = useTimefilter({ timeRangeSelector: false, autoRefreshSelector: true });

  const [globalState, setGlobalState] = useUrlState('_g');

  const mlTimefilterRefresh = useObservable(mlTimefilterRefresh$);
  const lastRefresh = mlTimefilterRefresh?.lastRefresh ?? 0;
  const refreshValue = globalState?.refreshInterval?.value ?? 0;
  const refreshPause = globalState?.refreshInterval?.pause ?? true;
  const blockRefresh = refreshValue === 0 || refreshPause === true;

  useEffect(() => {
    // If the refreshInterval defaults to 0s/pause=true, set it to 30s/pause=false,
    // otherwise pass on the globalState's settings to the date picker.
    const refreshInterval =
      refreshValue === 0 && refreshPause === true
        ? { pause: false, value: DEFAULT_REFRESH_INTERVAL_MS }
        : { pause: refreshPause, value: refreshValue };
    setGlobalState({ refreshInterval }, undefined, true);
    timefilter.setRefreshInterval(refreshInterval);
  }, []);
  const annotationUpdatesService = useMemo(() => new AnnotationUpdatesService(), []);

  return (
    <PageLoader context={context}>
      <MlAnnotationUpdatesContext.Provider value={annotationUpdatesService}>
        <JobsPage blockRefresh={blockRefresh} lastRefresh={lastRefresh} />
      </MlAnnotationUpdatesContext.Provider>
    </PageLoader>
  );
};
