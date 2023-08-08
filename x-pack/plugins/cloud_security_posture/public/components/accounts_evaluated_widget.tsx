/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { CIS_AWS, CIS_GCP } from '../../common/constants';
import { Cluster } from '../../common/types';
import { CISBenchmarkIcon } from './cis_benchmark_icon';
import { CompactFormattedNumber } from './compact_formatted_number';

export const AccountsEvaluatedWidget = ({
  clusters,
  benchmarkAbbreviateAbove = 999,
}: {
  clusters: Cluster[];
  /** numbers higher than the value of this field will be abbreviated using compact notation and have a tooltip displaying the full value */
  benchmarkAbbreviateAbove?: number;
}) => {
  const filterClustersById = (benchmarkId: string) => {
    return clusters?.filter((obj) => obj?.meta.benchmark.id === benchmarkId) || [];
  };

  const cisAwsClusterAmount = filterClustersById(CIS_AWS).length;
  const cisGcpClusterAmount = filterClustersById(CIS_GCP).length;

  const cisAwsBenchmarkName = filterClustersById(CIS_AWS)[0]?.meta.benchmark.name || '';
  const cisGcpBenchmarkName = filterClustersById(CIS_GCP)[0]?.meta.benchmark.name || '';

  return (
    <>
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs">
            <EuiFlexItem>
              <CISBenchmarkIcon type={CIS_AWS} name={cisAwsBenchmarkName} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <CompactFormattedNumber
                number={cisAwsClusterAmount}
                abbreviateAbove={benchmarkAbbreviateAbove}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="xs">
            <EuiFlexItem grow={false}>
              <CISBenchmarkIcon type={CIS_GCP} name={cisGcpBenchmarkName} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <CompactFormattedNumber
                number={cisGcpClusterAmount}
                abbreviateAbove={benchmarkAbbreviateAbove}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
