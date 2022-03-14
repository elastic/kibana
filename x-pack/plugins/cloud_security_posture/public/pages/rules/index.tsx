/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { useQuery } from 'react-query';
import { RouteComponentProps } from 'react-router-dom';
import { EuiText, EuiTextColor, EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { CspPageTemplate } from '../../components/page_template';
import { RulesContainer, type PageUrlParams } from './rules_container';
import { allNavigationItems } from '../../common/navigation/constants';
import { useCspBreadcrumbs } from '../../common/navigation/use_csp_breadcrumbs';
import { useKibana } from '../../common/hooks/use_kibana';
import { type PackagePolicy, packagePolicyRouteService } from '../../../../../plugins/fleet/common';
import type { KibanaPageTemplateProps } from '../../../../../../src/plugins/kibana_react/public';
import { CspLoadingState } from '../../components/csp_loading_state';
import { CspNavigationItem } from '../../common/navigation/types';

const useCspIntegrationInfo = ({ packagePolicyId }: PageUrlParams) => {
  const { http } = useKibana().services;
  return useQuery(
    ['packagePolicy', { packagePolicyId }],
    () => http.get<{ item: PackagePolicy }>(packagePolicyRouteService.getInfoPath(packagePolicyId)),
    { select: (response) => response.item, enabled: !!packagePolicyId }
  );
};

const getRulesBreadcrumbs = (name?: string): CspNavigationItem[] =>
  [allNavigationItems.benchmarks, { ...allNavigationItems.rules, name }].filter(
    (breadcrumb): breadcrumb is CspNavigationItem => !!breadcrumb.name
  );

export const Rules = ({ match: { params } }: RouteComponentProps<PageUrlParams>) => {
  const integrationInfo = useCspIntegrationInfo(params);
  const breadcrumbs = useMemo(
    // TODO: make benchmark breadcrumb navigable
    () => getRulesBreadcrumbs(integrationInfo.data?.name),
    [integrationInfo.data?.name]
  );

  useCspBreadcrumbs(breadcrumbs);

  const pageProps: KibanaPageTemplateProps = useMemo(
    () => ({
      pageHeader: {
        bottomBorder: false,
        pageTitle: 'Rules',
        description: integrationInfo.data && integrationInfo.data.package && (
          <PageDescription
            text={`${integrationInfo.data.package.title}, ${integrationInfo.data.name}`}
          />
        ),
      },
    }),
    [integrationInfo.data]
  );

  return (
    <CspPageTemplate {...pageProps}>
      {integrationInfo.status === 'success' && <RulesContainer />}
      {integrationInfo.status === 'error' && <RulesErrorPrompt />}
      {integrationInfo.status === 'loading' && <CspLoadingState />}
    </CspPageTemplate>
  );
};

const PageDescription = ({ text }: { text: string }) => (
  <EuiText size="s">
    <EuiTextColor color="subdued">{text}</EuiTextColor>
  </EuiText>
);

const RulesErrorPrompt = () => (
  <EuiEmptyPrompt
    {...{
      color: 'danger',
      iconType: 'alert',
      title: (
        <FormattedMessage
          id="xpack.csp.rules.missingIntegrationErrorMessage"
          defaultMessage="Missing integration"
        />
      ),
    }}
  />
);
