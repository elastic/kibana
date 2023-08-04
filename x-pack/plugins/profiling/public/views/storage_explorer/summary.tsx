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
import { i18n } from '@kbn/i18n';
import { asDynamicBytes } from '@kbn/observability-plugin/common';
import React from 'react';
import { StorageExplorerSummary } from '../../../common/storage_explorer';
import { asPercentage } from '../../utils/formatters/as_percentage';

interface Props {
  data?: StorageExplorerSummary;
  isLoading: boolean;
}
export function Summary({ data, isLoading }: Props) {
  const summaryInfo = [
    {
      title: i18n.translate('xpack.profiling.storageExplorer.summary.totalData', {
        defaultMessage: 'Total data',
      }),
      value: data?.totalProfilingSizeBytes
        ? asDynamicBytes(data?.totalProfilingSizeBytes)
        : undefined,
      hint: undefined,
    },
    {
      title: i18n.translate('xpack.profiling.storageExplorer.summary.dailyDataGeneration', {
        defaultMessage: 'Daily data generation',
      }),
      value: data?.dailyDataGenerationBytes
        ? asDynamicBytes(data?.dailyDataGenerationBytes)
        : undefined,

      hint: undefined,
    },
    {
      title: i18n.translate('xpack.profiling.storageExplorer.summary.totalDebugSymbolsSize', {
        defaultMessage: 'Total debug symbols size',
      }),
      value: data?.totalSymbolsSizeBytes ? asDynamicBytes(data?.totalSymbolsSizeBytes) : undefined,
      hint: undefined,
    },
    {
      title: i18n.translate('xpack.profiling.storageExplorer.summary.discSpaceUsed', {
        defaultMessage: 'Disc space used',
      }),
      value: data?.diskSpaceUsedPct ? asPercentage(data?.diskSpaceUsedPct) : undefined,
      hint: undefined,
    },
    {
      title: i18n.translate('xpack.profiling.storageExplorer.summary.numberOfMachines', {
        defaultMessage: 'Number of machines',
      }),
      value: data?.totalNumberOfHosts,
      hint: undefined,
    },
    {
      title: i18n.translate(
        'xpack.profiling.storageExplorer.summary.distinctProbabilisticProfilingValues',
        { defaultMessage: 'Distinct probabilistic profiling values' }
      ),
      value: data?.totalNumberOfDistinctProbabilisticValues,
      hint: undefined,
    },
  ];
  return (
    <EuiPanel hasShadow={false} hasBorder>
      <EuiFlexGroup justifyContent="spaceBetween">
        {summaryInfo.map((item, idx) => {
          return (
            <EuiFlexItem grow={false} key={idx}>
              <EuiStat
                description={
                  <EuiFlexGroup gutterSize="xs">
                    <EuiFlexItem grow={false} color="subdued">
                      <EuiText size="xs">{item.title}</EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiToolTip content={item.hint}>
                        <EuiIcon type="questionInCircle" />
                      </EuiToolTip>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                }
                titleSize="s"
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
