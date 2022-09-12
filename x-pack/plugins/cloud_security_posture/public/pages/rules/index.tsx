/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useMemo } from 'react';
import { generatePath, Link, type RouteComponentProps } from 'react-router-dom';
import {
  EuiButtonEmpty,
  EuiDescriptionListProps,
  EuiFlexGroup,
  EuiPageHeader,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { pagePathGetters } from '@kbn/fleet-plugin/public';
import { i18n } from '@kbn/i18n';
import { AgentPolicy, PackagePolicy } from '@kbn/fleet-plugin/common';
import { truthy } from '../../../common/utils/helpers';
import { CspInlineDescriptionList } from '../../components/csp_inline_description_list';
import { CloudPosturePageTitle } from '../../components/cloud_posture_page_title';
import type { BreadcrumbEntry } from '../../common/navigation/types';
import { RulesContainer, type PageUrlParams } from './rules_container';
import { cloudPosturePages } from '../../common/navigation/constants';
import { useCspBreadcrumbs } from '../../common/navigation/use_csp_breadcrumbs';
import { useCspIntegrationInfo } from './use_csp_integration';
import { useKibana } from '../../common/hooks/use_kibana';
import { CloudPosturePage } from '../../components/cloud_posture_page';
import { SecuritySolutionContext } from '../../application/security_solution_context';
import { CloudPostureIntegrations, cloudPostureIntegrations } from '../../common/constants';
import * as TEST_SUBJECTS from './test_subjects';

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

const assertPolicyTemplate = (
  policyTemplate: unknown
): policyTemplate is keyof CloudPostureIntegrations => {
  if (typeof policyTemplate !== 'string') return false;

  return cloudPostureIntegrations.hasOwnProperty(policyTemplate);
};

const getRulesSharedValues = (
  packageInfo: PackagePolicy,
  agentInfo: AgentPolicy
): EuiDescriptionListProps['listItems'] => {
  const enabledPackage = packageInfo.inputs?.find((input) => input.enabled);
  if (!enabledPackage || !assertPolicyTemplate(enabledPackage.policy_template)) return;

  const integration = cloudPostureIntegrations[enabledPackage.policy_template];
  if (!integration) return;

  const enabledIntegrationOption = integration.options.find(
    (option) => option.type === enabledPackage.type
  );

  return [
    {
      title: i18n.translate('xpack.csp.rules.rulesPageSharedValues.integrationTitle', {
        defaultMessage: 'Integration',
      }),
      description: integration.shortName,
    },
    !!enabledIntegrationOption?.name && {
      title: i18n.translate('xpack.csp.rules.rulesPageSharedValues.typeTitle', {
        defaultMessage: 'Type',
      }),
      description: enabledIntegrationOption.name,
    },
    !!enabledIntegrationOption?.benchmark && {
      title: i18n.translate('xpack.csp.rules.rulesPageSharedValues.benchmarkTitle', {
        defaultMessage: 'Benchmark',
      }),
      description: enabledIntegrationOption.benchmark,
    },
    {
      title: i18n.translate('xpack.csp.rules.rulesPageSharedValues.agentPolicyTitle', {
        defaultMessage: 'Agent Policy',
      }),
      description: agentInfo.name,
    },
  ].filter(truthy);
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
          packageInfo &&
          agentInfo && (
            <div data-test-subj={TEST_SUBJECTS.CSP_RULES_SHARED_VALUES}>
              <CspInlineDescriptionList listItems={getRulesSharedValues(packageInfo, agentInfo)} />
            </div>
          )
        }
        bottomBorder
      />
      <EuiSpacer />
      <RulesContainer />
    </CloudPosturePage>
  );
};
