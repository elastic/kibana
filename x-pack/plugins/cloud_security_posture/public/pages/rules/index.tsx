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
  EuiFlexGroup,
  EuiPageHeader,
  EuiSpacer,
  EuiFlexItem,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { CloudPosturePageTitle } from '../../components/cloud_posture_page_title';
import { RulesContainer } from './rules_container';
import { cloudPosturePages } from '../../common/navigation/constants';
import { CloudPosturePage } from '../../components/cloud_posture_page';
import { useSecuritySolutionContext } from '../../application/security_solution_context';
import { useCspBenchmarkIntegrationsV2 } from '../benchmarks/use_csp_benchmark_integrations';
import { CISBenchmarkIcon } from '../../components/cis_benchmark_icon';
import { getBenchmarkCisName } from '../../../common/utils/helpers';
import { BenchmarksCisId, PageUrlParams } from '../../../common/types/latest';

export const Rules = ({ match: { params } }: RouteComponentProps<PageUrlParams>) => {
  const { euiTheme } = useEuiTheme();
  const integrationInfo = useCspBenchmarkIntegrationsV2();
  const SpyRoute = useSecuritySolutionContext()?.getSpyRouteComponent();

  const [packageInfo] = integrationInfo.data?.items || [];

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
                        integrationName: getBenchmarkCisName(params.benchmarkId as BenchmarksCisId),
                      },
                    })}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
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
