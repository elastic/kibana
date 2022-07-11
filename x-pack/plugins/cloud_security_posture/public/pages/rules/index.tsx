/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { generatePath, Link, RouteComponentProps } from 'react-router-dom';
import { EuiTextColor, EuiEmptyPrompt, EuiButtonEmpty, EuiFlexGroup } from '@elastic/eui';
import * as t from 'io-ts';
import type { KibanaPageTemplateProps } from '@kbn/shared-ux-components';
import { FormattedMessage } from '@kbn/i18n-react';
import { pagePathGetters } from '@kbn/fleet-plugin/public';
import { css } from '@emotion/react';
import { RulesContainer, type PageUrlParams } from './rules_container';
import { allNavigationItems } from '../../common/navigation/constants';
import { useCspBreadcrumbs } from '../../common/navigation/use_csp_breadcrumbs';
import { CspNavigationItem } from '../../common/navigation/types';
import { extractErrorMessage } from '../../../common/utils/helpers';
import { useCspIntegrationInfo } from './use_csp_integration';
import { CspPageTemplate } from '../../components/csp_page_template';
import { useKibana } from '../../common/hooks/use_kibana';
import { SetupStatus } from '../../components/setup_status';

const getRulesBreadcrumbs = (name?: string): CspNavigationItem[] =>
  [allNavigationItems.benchmarks, { ...allNavigationItems.rules, name }].filter(
    (breadcrumb): breadcrumb is CspNavigationItem => !!breadcrumb.name
  );

export const Rules = ({ match: { params } }: RouteComponentProps<PageUrlParams>) => {
  const { http } = useKibana().services;
  const integrationInfo = useCspIntegrationInfo(params);

  const [packageInfo, agentInfo] = integrationInfo.data || [];

  const breadcrumbs = useMemo(
    // TODO: make benchmark breadcrumb navigable
    () => getRulesBreadcrumbs(packageInfo?.name),
    [packageInfo?.name]
  );

  useCspBreadcrumbs(breadcrumbs);

  const pageProps: KibanaPageTemplateProps = useMemo(
    () => ({
      pageHeader: {
        alignItems: 'bottom',
        rightSideItems: [
          <EuiButtonEmpty
            iconType="gear"
            size="xs"
            href={http.basePath.prepend(pagePathGetters.edit_integration(params).join(''))}
          >
            <FormattedMessage
              id="xpack.csp.rules.manageIntegrationButtonLabel"
              defaultMessage="Manage Integration"
            />
          </EuiButtonEmpty>,
        ],
        pageTitle: (
          <EuiFlexGroup direction="column" gutterSize="none">
            <Link to={generatePath(allNavigationItems.benchmarks.path)}>
              <EuiButtonEmpty iconType="arrowLeft" contentProps={{ style: { padding: 0 } }}>
                <FormattedMessage
                  id="xpack.csp.rules.rulesPageHeader.benchmarkIntegrationsButtonLabel"
                  defaultMessage="Benchmark Integrations"
                />
              </EuiButtonEmpty>
            </Link>
            <FormattedMessage
              id="xpack.csp.rules.rulePageHeader.pageHeaderTitle"
              defaultMessage="Rules - {integrationName}"
              values={{
                integrationName: packageInfo?.name,
              }}
            />
          </EuiFlexGroup>
        ),
        description: packageInfo?.package && agentInfo?.name && (
          <EuiTextColor color="subdued">
            <FormattedMessage
              id="xpack.csp.rules.rulePageHeader.pageDescriptionTitle"
              defaultMessage="{integrationType}, {agentPolicyName}"
              values={{
                integrationType: packageInfo.package.title,
                agentPolicyName: agentInfo.name,
              }}
            />
          </EuiTextColor>
        ),
      },
    }),
    [agentInfo?.name, http.basePath, packageInfo?.name, packageInfo?.package, params]
  );

  return (
    <CspPageTemplate {...pageProps}>
      <SetupStatus
        query={integrationInfo}
        errorRender={(error) => <RulesErrorPrompt error={extractErrorBodyMessage(error)} />}
      >
        <RulesContainer />
      </SetupStatus>
    </CspPageTemplate>
  );
};

// react-query puts the response data on the 'error' object
const bodyError = t.type({
  body: t.type({
    message: t.string,
  }),
});

const extractErrorBodyMessage = (err: unknown) => {
  if (bodyError.is(err)) return err.body.message;
  return extractErrorMessage(err);
};

const RulesErrorPrompt = ({ error }: { error: string }) => (
  <EuiEmptyPrompt
    css={css`
      margin-top: 50px;
    `}
    color={'danger'}
    iconType={'alert'}
    title={<h2>{error}</h2>}
  />
);
