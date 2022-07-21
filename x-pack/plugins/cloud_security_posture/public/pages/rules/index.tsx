/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { generatePath, Link, type RouteComponentProps } from 'react-router-dom';
import { EuiTextColor, EuiButtonEmpty, EuiFlexGroup, EuiPageHeader, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { pagePathGetters } from '@kbn/fleet-plugin/public';
import { RulesContainer, type PageUrlParams } from './rules_container';
import { cloudPosturePages } from '../../common/navigation/constants';
import { useCspBreadcrumbs } from '../../common/navigation/use_csp_breadcrumbs';
import type { CspPageNavigationItem } from '../../common/navigation/types';
import { useCspIntegrationInfo } from './use_csp_integration';
import { CspPageTemplate } from '../../components/csp_page_template';
import { useKibana } from '../../common/hooks/use_kibana';
import { CloudPosturePage } from '../../components/cloud_posture_page';

const getRulesBreadcrumbs = (name?: string): CspPageNavigationItem[] =>
  [cloudPosturePages.benchmarks, { ...cloudPosturePages.rules, name }].filter(
    (breadcrumb): breadcrumb is CspPageNavigationItem => !!breadcrumb.name
  );

export const RulesNoPageTemplate = ({ match: { params } }: RouteComponentProps<PageUrlParams>) => {
  const { http } = useKibana().services;
  const integrationInfo = useCspIntegrationInfo(params);

  const [packageInfo, agentInfo] = integrationInfo.data || [];

  return (
    <CloudPosturePage query={integrationInfo}>
      <EuiPageHeader
        alignItems={'bottom'}
        rightSideItems={[
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
        ]}
        pageTitle={
          <EuiFlexGroup direction="column" gutterSize="none">
            <Link to={generatePath(cloudPosturePages.benchmarks.path)}>
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
        }
        description={
          packageInfo?.package &&
          agentInfo?.name && (
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
          )
        }
        bottomBorder
      />
      <EuiSpacer />
      <RulesContainer />
    </CloudPosturePage>
  );
};

export const Rules = (props: RouteComponentProps<PageUrlParams>) => {
  const { params } = props.match;
  const integrationInfo = useCspIntegrationInfo(params);

  const [packageInfo] = integrationInfo.data || [];

  const breadcrumbs = useMemo(
    // TODO: make benchmark breadcrumb navigable
    () => getRulesBreadcrumbs(packageInfo?.name),
    [packageInfo?.name]
  );

  useCspBreadcrumbs(breadcrumbs);

  return (
    <CspPageTemplate>
      <RulesNoPageTemplate {...props} />
    </CspPageTemplate>
  );
};
