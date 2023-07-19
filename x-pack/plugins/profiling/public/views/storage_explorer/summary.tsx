/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiStat,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import React from 'react';
import { asDynamicBytes } from '@kbn/observability-plugin/common';
import { StorageExplorerSummary } from '../../../common/storage_explorer';
import { asPercentage } from '../../utils/formatters/as_percentage';

interface Props {
  data?: StorageExplorerSummary;
  isLoading: boolean;
}
export function Summary({ data, isLoading }: Props) {
  const summaryInfo = [
    {
      title: 'Total data',
      value: data?.totalProfilingSizeBytes
        ? asDynamicBytes(data?.totalProfilingSizeBytes)
        : undefined,
      hint: 'Hint',
    },
    {
      title: 'Daily data generation',
      value: data?.dailyDataGenerationBytes
        ? asDynamicBytes(data?.dailyDataGenerationBytes)
        : undefined,

      hint: 'Hint',
    },
    {
      title: 'Total debug symbols size',
      value: data?.totalSymbolsSizeBytes ? asDynamicBytes(data?.totalSymbolsSizeBytes) : undefined,
      hint: 'Hint',
    },
    {
      title: 'Disc space used',
      value: data?.diskSpaceUsedPct ? asPercentage(data?.diskSpaceUsedPct) : undefined,
      hint: 'Hint',
    },
    {
      title: 'Number of machines',
      value: data?.totalNumberOfHosts,
      hint: 'Hint',
    },
    {
      title: 'Distinct probabilistic profiling values',
      value: data?.totalNumberOfDistinctProbabilisticValues,
      hint: 'Hint',
    },
  ];
  return (
    <EuiPanel hasShadow={false} hasBorder>
      <EuiFlexGroup>
        {summaryInfo.map((item, idx) => {
          return (
            <EuiFlexItem grow={false} key={idx}>
              <EuiStat
                description={
                  <EuiFlexGroup gutterSize="xs">
                    <EuiFlexItem grow={false}>
                      <EuiText>{item.title}</EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiToolTip content={item.hint}>
                        <EuiIcon type="questionInCircle" />
                      </EuiToolTip>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                }
                title={item.value}
                isLoading={isLoading}
              />
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    </EuiPanel>
  );
}
