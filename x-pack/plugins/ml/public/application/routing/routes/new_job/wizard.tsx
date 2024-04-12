/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'query-string';
import type { FC } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { Redirect } from 'react-router-dom';
import { dynamic } from '@kbn/shared-ux-utility';
import { DataSourceContextProvider } from '../../../contexts/ml/data_source_context';
import type { NavigateToPath } from '../../../contexts/kibana';
import { useMlKibana } from '../../../contexts/kibana';
import { basicResolvers } from '../../resolvers';
import type { MlRoute, PageProps } from '../../router';
import { createPath, PageLoader } from '../../router';
import { useRouteResolver } from '../../use_resolver';
import { JOB_TYPE } from '../../../../../common/constants/new_job';
import { mlJobService } from '../../../services/job_service';
import {
  loadNewJobCapabilities,
  ANOMALY_DETECTOR,
} from '../../../services/new_job_capabilities/load_new_job_capabilities';
import { checkCreateJobsCapabilitiesResolver } from '../../../capabilities/check_capabilities';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';
import { useCreateAndNavigateToMlLink } from '../../../contexts/kibana/use_create_url';
import { ML_PAGES } from '../../../../../common/constants/locator';

interface WizardPageProps extends PageProps {
  jobType: JOB_TYPE;
}

const Page = dynamic(async () => ({
  default: (await import('../../../jobs/new_job/pages/new_job')).Page,
}));

const getBaseBreadcrumbs = (navigateToPath: NavigateToPath, basePath: string) => [
  getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
  getBreadcrumbWithUrlForApp('ANOMALY_DETECTION_BREADCRUMB', navigateToPath, basePath),
  getBreadcrumbWithUrlForApp('CREATE_JOB_BREADCRUMB', navigateToPath, basePath),
];

const getSingleMetricBreadcrumbs = (navigateToPath: NavigateToPath, basePath: string) => [
  ...getBaseBreadcrumbs(navigateToPath, basePath),
  {
    text: i18n.translate('xpack.ml.jobsBreadcrumbs.singleMetricLabel', {
      defaultMessage: 'Single metric',
    }),
    href: '',
  },
];

const getMultiMetricBreadcrumbs = (navigateToPath: NavigateToPath, basePath: string) => [
  ...getBaseBreadcrumbs(navigateToPath, basePath),
  {
    text: i18n.translate('xpack.ml.jobsBreadcrumbs.multiMetricLabel', {
      defaultMessage: 'Multi-metric',
    }),
    href: '',
  },
];

const getPopulationBreadcrumbs = (navigateToPath: NavigateToPath, basePath: string) => [
  ...getBaseBreadcrumbs(navigateToPath, basePath),
  {
    text: i18n.translate('xpack.ml.jobsBreadcrumbs.populationLabel', {
      defaultMessage: 'Population',
    }),
    href: '',
  },
];

const getAdvancedBreadcrumbs = (navigateToPath: NavigateToPath, basePath: string) => [
  ...getBaseBreadcrumbs(navigateToPath, basePath),
  {
    text: i18n.translate('xpack.ml.jobsBreadcrumbs.advancedConfigurationLabel', {
      defaultMessage: 'Advanced configuration',
    }),
    href: '',
  },
];

const getCategorizationBreadcrumbs = (navigateToPath: NavigateToPath, basePath: string) => [
  ...getBaseBreadcrumbs(navigateToPath, basePath),
  {
    text: i18n.translate('xpack.ml.jobsBreadcrumbs.categorizationLabel', {
      defaultMessage: 'Categorization',
    }),
    href: '',
  },
];

const getRareBreadcrumbs = (navigateToPath: NavigateToPath, basePath: string) => [
  ...getBaseBreadcrumbs(navigateToPath, basePath),
  {
    text: i18n.translate('xpack.ml.jobsBreadcrumbs.rareLabel', {
      defaultMessage: 'Rare',
    }),
    href: '',
  },
];

const getGeoBreadcrumbs = (navigateToPath: NavigateToPath, basePath: string) => [
  ...getBaseBreadcrumbs(navigateToPath, basePath),
  {
    text: i18n.translate('xpack.ml.jobsBreadcrumbs.geoLabel', {
      defaultMessage: 'Geo',
    }),
    href: '',
  },
];

export const singleMetricRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  path: createPath(ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SINGLE_METRIC),
  render: (props, deps) => <PageWrapper {...props} jobType={JOB_TYPE.SINGLE_METRIC} deps={deps} />,
  breadcrumbs: getSingleMetricBreadcrumbs(navigateToPath, basePath),
});

export const multiMetricRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  path: createPath(ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_MULTI_METRIC),
  render: (props, deps) => <PageWrapper {...props} jobType={JOB_TYPE.MULTI_METRIC} deps={deps} />,
  breadcrumbs: getMultiMetricBreadcrumbs(navigateToPath, basePath),
});

// redirect route to reset the job wizard when converting to multi metric job
export const multiMetricRouteFactoryRedirect = (): MlRoute => ({
  path: createPath(ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_CONVERT_TO_MULTI_METRIC),
  render: (props) => {
    return (
      <Redirect
        to={createPath(ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_MULTI_METRIC, props.location.search)}
      />
    );
  },

  breadcrumbs: [],
});

export const populationRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  path: createPath(ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_POPULATION),
  render: (props, deps) => <PageWrapper {...props} jobType={JOB_TYPE.POPULATION} deps={deps} />,
  breadcrumbs: getPopulationBreadcrumbs(navigateToPath, basePath),
});

export const advancedRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  path: createPath(ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_ADVANCED),
  render: (props, deps) => <PageWrapper {...props} jobType={JOB_TYPE.ADVANCED} deps={deps} />,
  breadcrumbs: getAdvancedBreadcrumbs(navigateToPath, basePath),
});

// redirect route to reset the job wizard when converting to advanced job
export const advancedRouteFactoryRedirect = (): MlRoute => ({
  path: createPath(ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_CONVERT_TO_ADVANCED),
  render: (props) => (
    <Redirect
      to={createPath(ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_ADVANCED, props.location.search)}
    />
  ),
  breadcrumbs: [],
});

export const categorizationRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  path: createPath(ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_CATEGORIZATION),
  render: (props, deps) => <PageWrapper {...props} jobType={JOB_TYPE.CATEGORIZATION} deps={deps} />,
  breadcrumbs: getCategorizationBreadcrumbs(navigateToPath, basePath),
});

export const rareRouteFactory = (navigateToPath: NavigateToPath, basePath: string): MlRoute => ({
  path: createPath(ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_RARE),
  render: (props, deps) => <PageWrapper {...props} jobType={JOB_TYPE.RARE} deps={deps} />,
  breadcrumbs: getRareBreadcrumbs(navigateToPath, basePath),
});

export const geoRouteFactory = (navigateToPath: NavigateToPath, basePath: string): MlRoute => ({
  path: createPath(ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_GEO),
  render: (props, deps) => <PageWrapper {...props} jobType={JOB_TYPE.GEO} deps={deps} />,
  breadcrumbs: getGeoBreadcrumbs(navigateToPath, basePath),
});

const PageWrapper: FC<WizardPageProps> = ({ location, jobType }) => {
  const redirectToJobsManagementPage = useCreateAndNavigateToMlLink(
    ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE
  );

  const { index, savedSearchId }: Record<string, any> = parse(location.search, { sort: false });

  const {
    services: {
      data: { dataViews: dataViewsService },
      savedSearch: savedSearchService,
    },
  } = useMlKibana();

  const { context, results } = useRouteResolver('full', ['canGetJobs', 'canCreateJob'], {
    ...basicResolvers(),
    // TODO useRouteResolver should be responsible for the redirect
    privileges: () => checkCreateJobsCapabilitiesResolver(redirectToJobsManagementPage),
    jobCaps: () =>
      loadNewJobCapabilities(
        index,
        savedSearchId,
        dataViewsService,
        savedSearchService,
        ANOMALY_DETECTOR
      ),
    existingJobsAndGroups: mlJobService.getJobAndGroupIds,
  });

  return (
    <PageLoader context={context}>
      <DataSourceContextProvider>
        {results ? (
          <Page jobType={jobType} existingJobsAndGroups={results.existingJobsAndGroups} />
        ) : null}
      </DataSourceContextProvider>
    </PageLoader>
  );
};
