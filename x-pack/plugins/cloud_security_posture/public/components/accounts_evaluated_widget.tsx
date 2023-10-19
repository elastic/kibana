/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { CIS_AWS, CIS_GCP, CIS_AZURE, CIS_K8S, CIS_EKS } from '../../common/constants';
import { Cluster } from '../../common/types';
import { CISBenchmarkIcon } from './cis_benchmark_icon';
import { CompactFormattedNumber } from './compact_formatted_number';
import { useNavigateFindings } from '../common/hooks/use_navigate_findings';

// order in array will determine order of appearance in the dashboard
const benchmarks = [
  {
    type: CIS_AWS,
    name: 'Amazon Web Services (AWS)',
    provider: 'aws',
  },
  {
    type: CIS_GCP,
    name: 'Google Cloud Platform (GCP)',
    provider: 'gcp',
  },
  {
    type: CIS_AZURE,
    name: 'Azure',
    provider: 'azure',
  },
  {
    type: CIS_K8S,
    name: 'Kubernetes',
    benchmarkId: 'cis_k8s',
  },
  {
    type: CIS_EKS,
    name: 'Amazon Elastic Kubernetes Service (EKS)',
    benchmarkId: 'cis_eks',
  },
];

export const AccountsEvaluatedWidget = ({
  clusters,
  benchmarkAbbreviateAbove = 999,
}: {
  clusters: Cluster[];
  /** numbers higher than the value of this field will be abbreviated using compact notation and have a tooltip displaying the full value */
  benchmarkAbbreviateAbove?: number;
}) => {
  const { euiTheme } = useEuiTheme();

  const filterClustersById = (benchmarkId: string) => {
    return clusters?.filter((obj) => obj?.meta.benchmark.id === benchmarkId) || [];
  };

  const navToFindings = useNavigateFindings();

  const navToFindingsByCloudProvider = (provider: string) => {
    navToFindings({ 'cloud.provider': provider });
  };

  const navToFindingsByCisBenchmark = (cisBenchmark: string) => {
    navToFindings({ 'rule.benchmark.id': cisBenchmark });
  };

  const benchmarkElements = benchmarks.map((benchmark) => {
    const clusterAmount = filterClustersById(benchmark.type).length;

    return (
      clusterAmount > 0 && (
        <EuiFlexItem
          key={benchmark.type}
          onClick={() => {
            if (benchmark.provider) {
              navToFindingsByCloudProvider(benchmark.provider);
            }
            if (benchmark.benchmarkId) {
              navToFindingsByCisBenchmark(benchmark.benchmarkId);
            }
          }}
          css={css`
            transition: ${euiTheme.animation.normal} ease-in;
            border-bottom: ${euiTheme.border.thick};
            border-color: transparent;

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
                number={clusterAmount}
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
