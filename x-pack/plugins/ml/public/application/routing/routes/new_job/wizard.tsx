/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parse } from 'query-string';
import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';

import { ApplicationStart } from 'kibana/public';

import { basicResolvers } from '../../resolvers';
import { MlRoute, PageLoader, PageProps } from '../../router';
import { useResolver } from '../../use_resolver';
import { Page } from '../../../jobs/new_job/pages/new_job';
import { JOB_TYPE } from '../../../../../common/constants/new_job';
import { mlJobService } from '../../../services/job_service';
import { loadNewJobCapabilities } from '../../../services/new_job_capabilities_service';
import { checkCreateJobsCapabilitiesResolver } from '../../../capabilities/check_capabilities';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';

interface WizardPageProps extends PageProps {
  jobType: JOB_TYPE;
}

const getBaseBreadcrumbs = (application: ApplicationStart) => [
  getBreadcrumbWithUrlForApp('ML_BREADCRUMB', application),
  getBreadcrumbWithUrlForApp('ANOMALY_DETECTION_BREADCRUMB', application),
  getBreadcrumbWithUrlForApp('CREATE_JOB_BREADCRUMB', application),
];

const getSingleMetricBreadcrumbs = (application: ApplicationStart) => [
  ...getBaseBreadcrumbs(application),
  {
    text: i18n.translate('xpack.ml.jobsBreadcrumbs.singleMetricLabel', {
      defaultMessage: 'Single metric',
    }),
    href: '',
  },
];

const getMultiMetricBreadcrumbs = (application: ApplicationStart) => [
  ...getBaseBreadcrumbs(application),
  {
    text: i18n.translate('xpack.ml.jobsBreadcrumbs.multiMetricLabel', {
      defaultMessage: 'Multi-metric',
    }),
    href: '',
  },
];

const getPopulationBreadcrumbs = (application: ApplicationStart) => [
  ...getBaseBreadcrumbs(application),
  {
    text: i18n.translate('xpack.ml.jobsBreadcrumbs.populationLabel', {
      defaultMessage: 'Population',
    }),
    href: '',
  },
];

const getAdvancedBreadcrumbs = (application: ApplicationStart) => [
  ...getBaseBreadcrumbs(application),
  {
    text: i18n.translate('xpack.ml.jobsBreadcrumbs.advancedConfigurationLabel', {
      defaultMessage: 'Advanced configuration',
    }),
    href: '',
  },
];

const getCategorizationBreadcrumbs = (application: ApplicationStart) => [
  ...getBaseBreadcrumbs(application),
  {
    text: i18n.translate('xpack.ml.jobsBreadcrumbs.categorizationLabel', {
      defaultMessage: 'Categorization',
    }),
    href: '',
  },
];

export const singleMetricRouteFactory = (application: ApplicationStart): MlRoute => ({
  path: '/jobs/new_job/single_metric',
  render: (props, deps) => <PageWrapper {...props} jobType={JOB_TYPE.SINGLE_METRIC} deps={deps} />,
  breadcrumbs: getSingleMetricBreadcrumbs(application),
});

export const multiMetricRouteFactory = (application: ApplicationStart): MlRoute => ({
  path: '/jobs/new_job/multi_metric',
  render: (props, deps) => <PageWrapper {...props} jobType={JOB_TYPE.MULTI_METRIC} deps={deps} />,
  breadcrumbs: getMultiMetricBreadcrumbs(application),
});

export const populationRouteFactory = (application: ApplicationStart): MlRoute => ({
  path: '/jobs/new_job/population',
  render: (props, deps) => <PageWrapper {...props} jobType={JOB_TYPE.POPULATION} deps={deps} />,
  breadcrumbs: getPopulationBreadcrumbs(application),
});

export const advancedRouteFactory = (application: ApplicationStart): MlRoute => ({
  path: '/jobs/new_job/advanced',
  render: (props, deps) => <PageWrapper {...props} jobType={JOB_TYPE.ADVANCED} deps={deps} />,
  breadcrumbs: getAdvancedBreadcrumbs(application),
});

export const categorizationRouteFactory = (application: ApplicationStart): MlRoute => ({
  path: '/jobs/new_job/categorization',
  render: (props, deps) => <PageWrapper {...props} jobType={JOB_TYPE.CATEGORIZATION} deps={deps} />,
  breadcrumbs: getCategorizationBreadcrumbs(application),
});

const PageWrapper: FC<WizardPageProps> = ({ location, jobType, deps }) => {
  const { index, savedSearchId }: Record<string, any> = parse(location.search, { sort: false });
  const { context, results } = useResolver(index, savedSearchId, deps.config, {
    ...basicResolvers(deps),
    privileges: checkCreateJobsCapabilitiesResolver,
    jobCaps: () => loadNewJobCapabilities(index, savedSearchId, deps.indexPatterns),
    existingJobsAndGroups: mlJobService.getJobAndGroupIds,
  });

  return (
    <PageLoader context={context}>
      <Page jobType={jobType} existingJobsAndGroups={results.existingJobsAndGroups} />
    </PageLoader>
  );
};
