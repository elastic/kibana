/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { dynamic } from '@kbn/shared-ux-utility';
import { ML_PAGES } from '../../../../locator';
import type { NavigateToPath } from '../../../contexts/kibana';
import type { MlRoute } from '../../router';
import { createPath, PageLoader } from '../../router';
import { useRouteResolver } from '../../use_resolver';
import { basicResolvers } from '../../resolvers';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';
import { MlPageHeader } from '../../../components/page_header';

const PreconfiguredJobs = dynamic(async () => ({
  default: (await import('../../../preconfigured_jobs/preconfigured_jobs')).PreconfiguredJobs,
}));

export const preconfiguedJobsRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  id: 'preconfigured_jobs',
  path: createPath(ML_PAGES.PRECONFIGURED_JOBS_MANAGE),
  title: i18n.translate('xpack.ml.preconfiguredJobs.preconfiguredJobs.docTitle', {
    defaultMessage: 'Preconfigured Jobs"',
  }),
  render: () => <PageWrapper />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('ANOMALY_DETECTION_BREADCRUMB', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.preconfiguredJobsBreadcrumbs.preconfiguredJobsLabel', {
        defaultMessage: 'Preconfigured Jobs',
      }),
    },
  ],
  enableDatePicker: false,
  'data-test-subj': 'mlPagePreconfiguredJobs',
});

const PageWrapper: FC = () => {
  const { context } = useRouteResolver('full', ['canCreateJob'], basicResolvers());

  return (
    <PageLoader context={context}>
      <MlPageHeader>
        <EuiFlexGroup
          responsive={false}
          wrap={false}
          alignItems={'flexStart'}
          gutterSize={'m'}
          direction="column"
        >
          <EuiFlexItem grow={false}>
            <FormattedMessage
              id="xpack.ml.preconfiguredJobs.preconfigurecJobsHeader"
              defaultMessage="Preconfigured Jobs"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <FormattedMessage
                id="xpack.ml.preconfiguredJobs.preconfigurecJobsHeaderDescription"
                defaultMessage="This page lists the anomaly detection job packages that include supplied configurations for jobs and associated Kibana assets."
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </MlPageHeader>
      <PreconfiguredJobs />
    </PageLoader>
  );
};
