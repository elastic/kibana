/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiToolTip, useEuiTheme } from '@elastic/eui';
import { Cluster } from '../../common/types';
import { CISBenchmarkIcon } from './cis_benchmark_icon';

export const AccountsEvaluatedWidget = ({
  clusters,
  abbreviateAbove = 999,
}: {
  clusters: Cluster[];
  /** numbers higher than the value of this field will be abbreviated using compact notation and have a tooltip displaying the full value */
  abbreviateAbove?: number;
}) => {
  const { euiTheme } = useEuiTheme();
  const filterClustersById = (benchmarkId: string) => {
    return clusters?.filter((obj) => obj?.meta.benchmark.id === benchmarkId) || [];
  };

  const cisAwsClusterLength = filterClustersById('cis_aws').length;
  const cisGcpClusterLength = filterClustersById('cis_gcp').length;

  const cisAwsBenchmarkName = filterClustersById('cis_aws')[0]?.meta.benchmark.name || '';
  const cisGcpBenchmarkName = filterClustersById('cis_gcp')[0]?.meta.benchmark.name || '';

  // const cisAwsClusterLength = 94;
  // const cisGcpClusterLength = 12;

  if (cisAwsClusterLength <= abbreviateAbove) {
    return (
      <>
        <CISBenchmarkIcon type={'cis_aws'} name={cisAwsBenchmarkName} />
        <span css={{ paddingRight: euiTheme.size.m, paddingLeft: euiTheme.size.xs }}>
          {cisAwsClusterLength.toLocaleString()}
        </span>
        <CISBenchmarkIcon type={'cis_gcp'} name={cisGcpBenchmarkName} />
        <span css={{ paddingLeft: euiTheme.size.xs }}>{cisGcpClusterLength.toLocaleString()}</span>
      </>
    );
  }

  return (
    <>
      <EuiToolTip content={cisAwsClusterLength.toLocaleString()}>
        <CISBenchmarkIcon type={'cis_aws'} name={cisAwsBenchmarkName} />
      </EuiToolTip>
      <span css={{ paddingRight: euiTheme.size.m }}>
        {cisAwsClusterLength.toLocaleString(undefined, {
          notation: 'compact',
          maximumFractionDigits: 1,
        })}
      </span>

      <EuiToolTip content={cisGcpClusterLength.toLocaleString()}>
        <CISBenchmarkIcon type={'cis_gcp'} name={cisGcpBenchmarkName} />
      </EuiToolTip>
      <span>
        {cisGcpClusterLength.toLocaleString(undefined, {
          notation: 'compact',
          maximumFractionDigits: 1,
        })}
      </span>
    </>
  );
};
