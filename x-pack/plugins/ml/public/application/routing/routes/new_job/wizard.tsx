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

const getBaseBreadcrumbs = (getUrlForApp: ApplicationStart['getUrlForApp']) => [
  getBreadcrumbWithUrlForApp('ML_BREADCRUMB', getUrlForApp),
  getBreadcrumbWithUrlForApp('ANOMALY_DETECTION_BREADCRUMB', getUrlForApp),
  getBreadcrumbWithUrlForApp('CREATE_JOB_BREADCRUMB', getUrlForApp),
];

const getSingleMetricBreadcrumbs = (getUrlForApp: ApplicationStart['getUrlForApp']) => [
  ...getBaseBreadcrumbs(getUrlForApp),
  {
    text: i18n.translate('xpack.ml.jobsBreadcrumbs.singleMetricLabel', {
      defaultMessage: 'Single metric',
    }),
    href: '',
  },
];

const getMultiMetricBreadcrumbs = (getUrlForApp: ApplicationStart['getUrlForApp']) => [
  ...getBaseBreadcrumbs(getUrlForApp),
  {
    text: i18n.translate('xpack.ml.jobsBreadcrumbs.multiMetricLabel', {
      defaultMessage: 'Multi-metric',
    }),
    href: '',
  },
];

const getPopulationBreadcrumbs = (getUrlForApp: ApplicationStart['getUrlForApp']) => [
  ...getBaseBreadcrumbs(getUrlForApp),
  {
    text: i18n.translate('xpack.ml.jobsBreadcrumbs.populationLabel', {
      defaultMessage: 'Population',
    }),
    href: '',
  },
];

const getAdvancedBreadcrumbs = (getUrlForApp: ApplicationStart['getUrlForApp']) => [
  ...getBaseBreadcrumbs(getUrlForApp),
  {
    text: i18n.translate('xpack.ml.jobsBreadcrumbs.advancedConfigurationLabel', {
      defaultMessage: 'Advanced configuration',
    }),
    href: '',
  },
];

const getCategorizationBreadcrumbs = (getUrlForApp: ApplicationStart['getUrlForApp']) => [
  ...getBaseBreadcrumbs(getUrlForApp),
  {
    text: i18n.translate('xpack.ml.jobsBreadcrumbs.categorizationLabel', {
      defaultMessage: 'Categorization',
    }),
    href: '',
  },
];

export const singleMetricRouteFactory = (
  getUrlForApp: ApplicationStart['getUrlForApp']
): MlRoute => ({
  path: '/jobs/new_job/single_metric',
  render: (props, deps) => <PageWrapper {...props} jobType={JOB_TYPE.SINGLE_METRIC} deps={deps} />,
  breadcrumbs: getSingleMetricBreadcrumbs(getUrlForApp),
});

export const multiMetricRouteFactory = (
  getUrlForApp: ApplicationStart['getUrlForApp']
): MlRoute => ({
  path: '/jobs/new_job/multi_metric',
  render: (props, deps) => <PageWrapper {...props} jobType={JOB_TYPE.MULTI_METRIC} deps={deps} />,
  breadcrumbs: getMultiMetricBreadcrumbs(getUrlForApp),
});

export const populationRouteFactory = (
  getUrlForApp: ApplicationStart['getUrlForApp']
): MlRoute => ({
  path: '/jobs/new_job/population',
  render: (props, deps) => <PageWrapper {...props} jobType={JOB_TYPE.POPULATION} deps={deps} />,
  breadcrumbs: getPopulationBreadcrumbs(getUrlForApp),
});

export const advancedRouteFactory = (getUrlForApp: ApplicationStart['getUrlForApp']): MlRoute => ({
  path: '/jobs/new_job/advanced',
  render: (props, deps) => <PageWrapper {...props} jobType={JOB_TYPE.ADVANCED} deps={deps} />,
  breadcrumbs: getAdvancedBreadcrumbs(getUrlForApp),
});

export const categorizationRouteFactory = (
  getUrlForApp: ApplicationStart['getUrlForApp']
): MlRoute => ({
  path: '/jobs/new_job/categorization',
  render: (props, deps) => <PageWrapper {...props} jobType={JOB_TYPE.CATEGORIZATION} deps={deps} />,
  breadcrumbs: getCategorizationBreadcrumbs(getUrlForApp),
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
