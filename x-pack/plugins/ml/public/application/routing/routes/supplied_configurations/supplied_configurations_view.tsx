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

const SuppliedConfigurations = dynamic(async () => ({
  default: (await import('../../../supplied_configurations/supplied_configurations'))
    .SuppliedConfigurations,
}));

export const suppliedConfigurationsRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  id: 'supplied_configurations',
  path: createPath(ML_PAGES.SUPPLIED_CONFIGURATIONS),
  title: i18n.translate('xpack.ml.suppliedConfigurations.suppliedConfigurations.docTitle', {
    defaultMessage: 'Supplied configurations',
  }),
  render: () => <PageWrapper />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('ANOMALY_DETECTION_BREADCRUMB', navigateToPath, basePath),
    {
      text: i18n.translate(
        'xpack.ml.suppliedConfigurationsBreadcrumbs.suppliedConfigurationsLabel',
        {
          defaultMessage: 'Supplied configurations',
        }
      ),
    },
  ],
  enableDatePicker: false,
  'data-test-subj': 'mlPageSuppliedConfigurations',
});

const PageWrapper: FC = () => {
  const { context } = useRouteResolver('full', ['canGetJobs'], basicResolvers());

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
              id="xpack.ml.suppliedConfigurations.preconfigurecJobsHeader"
              defaultMessage="Supplied configurations"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <FormattedMessage
                id="xpack.ml.suppliedConfigurations.preconfigurecJobsHeaderDescription"
                defaultMessage="This page lists pre-defined anomaly detection job configurations with related Kibana assets."
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </MlPageHeader>
      <SuppliedConfigurations />
    </PageLoader>
  );
};
