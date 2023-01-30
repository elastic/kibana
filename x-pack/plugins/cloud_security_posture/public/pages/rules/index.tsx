/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { generatePath, Link, type RouteComponentProps } from 'react-router-dom';
import {
  EuiButtonEmpty,
  type EuiDescriptionListProps,
  EuiFlexGroup,
  EuiPageHeader,
  EuiSpacer,
  EuiFlexItem,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { pagePathGetters } from '@kbn/fleet-plugin/public';
import { i18n } from '@kbn/i18n';
import { PackagePolicy } from '@kbn/fleet-plugin/common';
import { CspInlineDescriptionList } from '../../components/csp_inline_description_list';
import { CloudPosturePageTitle } from '../../components/cloud_posture_page_title';
import { RulesContainer, type PageUrlParams } from './rules_container';
import { cloudPosturePages } from '../../common/navigation/constants';
import { useCspIntegrationInfo } from './use_csp_integration';
import { useKibana } from '../../common/hooks/use_kibana';
import { CloudPosturePage } from '../../components/cloud_posture_page';
import { useSecuritySolutionContext } from '../../application/security_solution_context';
import * as TEST_SUBJECTS from './test_subjects';
import { getEnabledCspIntegrationDetails } from '../../common/utils/get_enabled_csp_integration_details';

const getRulesSharedValues = (
  packageInfo?: PackagePolicy
): NonNullable<EuiDescriptionListProps['listItems']> => {
  const enabledIntegration = getEnabledCspIntegrationDetails(packageInfo);
  const values = [];

  if (enabledIntegration?.integration?.shortName) {
    values.push({
      title: i18n.translate('xpack.csp.rules.rulesPageSharedValues.integrationTitle', {
        defaultMessage: 'Integration',
      }),
      description: enabledIntegration?.integration.shortName,
    });
  }

  if (!enabledIntegration?.enabledIntegrationOption) return values;

  values.push(
    {
      title: i18n.translate('xpack.csp.rules.rulesPageSharedValues.deploymentTypeTitle', {
        defaultMessage: 'Deployment Type',
      }),
      description: enabledIntegration?.enabledIntegrationOption.name,
    },
    {
      title: i18n.translate('xpack.csp.rules.rulesPageSharedValues.benchmarkTitle', {
        defaultMessage: 'Benchmark',
      }),
      description: enabledIntegration?.enabledIntegrationOption.benchmark,
    }
  );

  return values;
};

export const Rules = ({ match: { params } }: RouteComponentProps<PageUrlParams>) => {
  const { http } = useKibana().services;
  const integrationInfo = useCspIntegrationInfo(params);
  const SpyRoute = useSecuritySolutionContext()?.getSpyRouteComponent();

  const [packageInfo] = integrationInfo.data || [];

  const sharedValues = getRulesSharedValues(packageInfo);

  return (
    <CloudPosturePage query={integrationInfo}>
      <EuiPageHeader
        alignItems={'bottom'}
        bottomBorder
        pageTitle={
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem style={{ width: 'fit-content' }}>
              <Link to={generatePath(cloudPosturePages.benchmarks.path)}>
                <EuiButtonEmpty iconType="arrowLeft" contentProps={{ style: { padding: 0 } }}>
                  <FormattedMessage
                    id="xpack.csp.rules.rulesPageHeader.benchmarkIntegrationsButtonLabel"
                    defaultMessage="Benchmark Integrations"
                  />
                </EuiButtonEmpty>
              </Link>
            </EuiFlexItem>
            <EuiFlexItem>
              <CloudPosturePageTitle
                title={i18n.translate('xpack.csp.rules.rulePageHeader.pageHeaderTitle', {
                  defaultMessage: 'Rules - {integrationName}',
                  values: {
                    integrationName: packageInfo?.name,
                  },
                })}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        description={
          sharedValues.length && (
            <div data-test-subj={TEST_SUBJECTS.CSP_RULES_SHARED_VALUES}>
              <CspInlineDescriptionList listItems={sharedValues} />
            </div>
          )
        }
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
      />
      <EuiSpacer />
      <RulesContainer />
      {SpyRoute && (
        <SpyRoute
          pageName={cloudPosturePages.benchmarks.id}
          state={{ ruleName: packageInfo?.name }}
        />
      )}
    </CloudPosturePage>
  );
};
