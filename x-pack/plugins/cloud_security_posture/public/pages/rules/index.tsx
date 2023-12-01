/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { generatePath, Link, type RouteComponentProps } from 'react-router-dom';
import {
  EuiButtonEmpty,
  type EuiDescriptionListProps,
  EuiFlexGroup,
  EuiPageHeader,
  EuiSpacer,
  EuiFlexItem,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
// import { pagePathGetters } from '@kbn/fleet-plugin/public';
import { i18n } from '@kbn/i18n';
import { PackagePolicy } from '@kbn/fleet-plugin/common';
// import { CspInlineDescriptionList } from '../../components/csp_inline_description_list';
import { CloudPosturePageTitle } from '../../components/cloud_posture_page_title';
import { RulesContainer, type PageUrlParams, PageUrlParamsVersion2 } from './rules_container';
import { cloudPosturePages } from '../../common/navigation/constants';
// import { useCspIntegrationInfo } from './use_csp_integration';
// import { useKibana } from '../../common/hooks/use_kibana';
import { CloudPosturePage } from '../../components/cloud_posture_page';
import { useSecuritySolutionContext } from '../../application/security_solution_context';
// import * as TEST_SUBJECTS from './test_subjects';
import { getEnabledCspIntegrationDetails } from '../../common/utils/get_enabled_csp_integration_details';
// import { pageSize } from '@kbn/files-plugin/server/routes/common_schemas';
import {
  useCspBenchmarkIntegrations,
  UseCspBenchmarkIntegrationsProps,
} from '../benchmarks/use_csp_benchmark_integrations';
import { getBenchmarkCisName } from '../../../common/utils/helpers';
import { CISBenchmarkIcon } from '../../components/cis_benchmark_icon';

// const getRulesSharedValues = (
//   packageInfo?: PackagePolicy
// ): NonNullable<EuiDescriptionListProps['listItems']> => {
//   const enabledIntegration = getEnabledCspIntegrationDetails(packageInfo);
//   const values = [];

//   if (enabledIntegration?.integration?.shortName) {
//     values.push({
//       title: i18n.translate('xpack.csp.rules.rulesPageSharedValues.integrationTitle', {
//         defaultMessage: 'Integration',
//       }),
//       description: enabledIntegration?.integration.shortName,
//     });
//   }

//   if (!enabledIntegration?.enabledIntegrationOption) return values;

//   values.push(
//     {
//       title: i18n.translate('xpack.csp.rules.rulesPageSharedValues.deploymentTypeTitle', {
//         defaultMessage: 'Deployment Type',
//       }),
//       description: enabledIntegration?.enabledIntegrationOption.name,
//     },
//     {
//       title: i18n.translate('xpack.csp.rules.rulesPageSharedValues.benchmarkTitle', {
//         defaultMessage: 'Benchmark',
//       }),
//       description: enabledIntegration?.enabledIntegrationOption.benchmark,
//     }
//   );

//   return values;
// };

export const Rules = ({ match: { params } }: RouteComponentProps<PageUrlParams>) => {
  // const { http } = useKibana().services;
  // const [query, setQuery] = useState<UseCspBenchmarkIntegrationsProps>({
  //   name: '',
  //   page: 1,
  //   perPage: 10,
  //   sortField: 'package_policy.name',
  //   sortOrder: 'asc',
  // });
  const query: UseCspBenchmarkIntegrationsProps = {
    name: '',
    page: 1,
    perPage: 10,
    sortField: 'package_policy.name',
    sortOrder: 'asc',
  };
  const { euiTheme } = useEuiTheme();
  const integrationInfo = useCspBenchmarkIntegrations(query);
  //const integrationInfo = useCspIntegrationInfo(params); // CHANGE THIS
  console.log(params);
  const SpyRoute = useSecuritySolutionContext()?.getSpyRouteComponent();

  const [packageInfo] = integrationInfo.data?.items || [];

  // const sharedValues = getRulesSharedValues(packageInfo);

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
                    id="xpack.csp.rules.rulesPageHeader.benchmarkRulesButtonLabel"
                    defaultMessage="Benchmark Rules"
                  />
                </EuiButtonEmpty>
              </Link>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem grow={false} style={{ marginBottom: `calc(${euiTheme.size.m}/2)` }}>
                  <CISBenchmarkIcon type={params.benchmarkId} size={'l'} />
                </EuiFlexItem>
                <EuiFlexItem>
                  <CloudPosturePageTitle
                    title={i18n.translate('xpack.csp.rules.rulePageHeader.pageHeaderTitle', {
                      defaultMessage: '{integrationName} - Rules',
                      values: {
                        integrationName: getBenchmarkCisName(params.benchmarkId),
                      },
                    })}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        // description={
        //   sharedValues.length && (
        //     <div data-test-subj={TEST_SUBJECTS.CSP_RULES_SHARED_VALUES}>
        //       <CspInlineDescriptionList listItems={sharedValues} />
        //     </div>
        //   )
        // }
        // rightSideItems={[
        //   <EuiButtonEmpty
        //     iconType="gear"
        //     size="xs"
        //     href={http.basePath.prepend(pagePathGetters.edit_integration(params).join(''))}
        //   >
        //     <FormattedMessage
        //       id="xpack.csp.rules.manageIntegrationButtonLabel"
        //       defaultMessage="Manage Integration"
        //     />
        //   </EuiButtonEmpty>,
        // ]}
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
