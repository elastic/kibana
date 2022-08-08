/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useMemo } from 'react';
import { generatePath, Link, type RouteComponentProps } from 'react-router-dom';
import { EuiTextColor, EuiButtonEmpty, EuiFlexGroup, EuiPageHeader, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { pagePathGetters } from '@kbn/fleet-plugin/public';
import { i18n } from '@kbn/i18n';
import { CloudPosturePageTitle } from '../../components/cloud_posture_page_title';
import type { BreadcrumbEntry } from '../../common/navigation/types';
import { RulesContainer, type PageUrlParams } from './rules_container';
import { cloudPosturePages } from '../../common/navigation/constants';
import { useCspBreadcrumbs } from '../../common/navigation/use_csp_breadcrumbs';
import { useCspIntegrationInfo } from './use_csp_integration';
import { useKibana } from '../../common/hooks/use_kibana';
import { CloudPosturePage } from '../../components/cloud_posture_page';
import { SecuritySolutionContext } from '../../application/security_solution_context';

const getRulesBreadcrumbs = (
  name?: string,
  manageBreadcrumb?: BreadcrumbEntry
): BreadcrumbEntry[] => {
  const breadCrumbs: BreadcrumbEntry[] = [];
  if (manageBreadcrumb) {
    breadCrumbs.push(manageBreadcrumb);
  }

  breadCrumbs.push(cloudPosturePages.benchmarks);

  if (name) {
    breadCrumbs.push({ ...cloudPosturePages.rules, name });
  } else {
    breadCrumbs.push(cloudPosturePages.rules);
  }

  return breadCrumbs;
};

export const Rules = ({ match: { params } }: RouteComponentProps<PageUrlParams>) => {
  const { http } = useKibana().services;
  const integrationInfo = useCspIntegrationInfo(params);
  const securitySolutionContext = useContext(SecuritySolutionContext);

  const [packageInfo, agentInfo] = integrationInfo.data || [];

  const breadcrumbs = useMemo(
    () =>
      getRulesBreadcrumbs(packageInfo?.name, securitySolutionContext?.getManageBreadcrumbEntry()),
    [packageInfo?.name, securitySolutionContext]
  );

  useCspBreadcrumbs(breadcrumbs);

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
            <CloudPosturePageTitle
              isBeta
              title={i18n.translate('xpack.csp.rules.rulePageHeader.pageHeaderTitle', {
                defaultMessage: 'Rules - {integrationName}',
                values: {
                  integrationName: packageInfo?.name,
                },
              })}
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
