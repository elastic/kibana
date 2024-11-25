/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useNavigateFindings } from '@kbn/cloud-security-posture/src/hooks/use_navigate_findings';
import { CSPM_POLICY_TEMPLATE } from '@kbn/cloud-security-posture-common';
import { CLOUD_PROVIDERS, getBenchmarkApplicableTo } from '../../common/utils/helpers';
import { CIS_AWS, CIS_GCP, CIS_AZURE, CIS_K8S, CIS_EKS } from '../../common/constants';
import { CISBenchmarkIcon } from './cis_benchmark_icon';
import { CompactFormattedNumber } from './compact_formatted_number';
import { BenchmarkData } from '../../common/types_old';
import { FINDINGS_GROUPING_OPTIONS } from '../common/constants';

// order in array will determine order of appearance in the dashboard
const benchmarks = [
  {
    type: CIS_AWS,
    name: getBenchmarkApplicableTo(CIS_AWS),
    provider: CLOUD_PROVIDERS.AWS,
  },
  {
    type: CIS_GCP,
    name: getBenchmarkApplicableTo(CIS_GCP),
    provider: CLOUD_PROVIDERS.GCP,
  },
  {
    type: CIS_AZURE,
    name: getBenchmarkApplicableTo(CIS_AZURE),
    provider: CLOUD_PROVIDERS.AZURE,
  },
  {
    type: CIS_K8S,
    name: getBenchmarkApplicableTo(CIS_K8S),
    benchmarkId: CIS_K8S,
  },
  {
    type: CIS_EKS,
    name: getBenchmarkApplicableTo(CIS_EKS),
    benchmarkId: CIS_EKS,
  },
];

export const AccountsEvaluatedWidget = ({
  benchmarkAssets,
  benchmarkAbbreviateAbove = 999,
}: {
  benchmarkAssets: BenchmarkData[];
  /** numbers higher than the value of this field will be abbreviated using compact notation and have a tooltip displaying the full value */
  benchmarkAbbreviateAbove?: number;
}) => {
  const { euiTheme } = useEuiTheme();

  const getBenchmarkById = (benchmarkId: string) => {
    return benchmarkAssets?.find((obj) => obj?.meta.benchmarkId === benchmarkId);
  };

  const navToFindings = useNavigateFindings();

  const navToFindingsByCloudProvider = (provider: string) => {
    navToFindings(
      { 'cloud.provider': provider, 'rule.benchmark.posture_type': CSPM_POLICY_TEMPLATE },
      [FINDINGS_GROUPING_OPTIONS.CLOUD_ACCOUNT_NAME]
    );
  };

  const navToFindingsByCisBenchmark = (cisBenchmark: string) => {
    navToFindings({ 'rule.benchmark.id': cisBenchmark }, [
      FINDINGS_GROUPING_OPTIONS.ORCHESTRATOR_CLUSTER_NAME,
    ]);
  };

  const benchmarkElements = benchmarks.map((benchmark) => {
    const cloudAssetAmount = getBenchmarkById(benchmark.type)?.meta?.assetCount || 0;

    return (
      cloudAssetAmount > 0 && (
        <EuiFlexItem
          key={benchmark.type}
          onClick={() => {
            if (benchmark.provider) {
              return navToFindingsByCloudProvider(benchmark.provider);
            }
            if (benchmark.benchmarkId) {
              return navToFindingsByCisBenchmark(benchmark.benchmarkId);
            }
          }}
          css={css`
            transition: ${euiTheme.animation.normal} ease-in;
            border-bottom: ${euiTheme.border.thick};
            border-color: transparent;
            text-wrap: nowrap;
            :hover {
              cursor: pointer;
              border-color: ${euiTheme.colors.darkestShade};
            }
          `}
        >
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            <EuiFlexItem>
              <CISBenchmarkIcon type={benchmark.type} name={benchmark.name} size={'l'} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <CompactFormattedNumber
                number={cloudAssetAmount}
                abbreviateAbove={benchmarkAbbreviateAbove}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      )
    );
  });

  // Render the benchmark elements
  return <EuiFlexGroup gutterSize="m">{benchmarkElements}</EuiFlexGroup>;
};
