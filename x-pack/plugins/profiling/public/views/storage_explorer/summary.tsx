/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiPanel, EuiStat, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { asDynamicBytes } from '@kbn/observability-plugin/common';
import React from 'react';
import { StackTracesDisplayOption, TopNType } from '@kbn/profiling-utils';
import { StorageExplorerSummaryAPIResponse } from '../../../common/storage_explorer';
import { useProfilingDependencies } from '../../components/contexts/profiling_dependencies/use_profiling_dependencies';
import { LabelWithHint } from '../../components/label_with_hint';
import { useProfilingParams } from '../../hooks/use_profiling_params';
import { useProfilingRouter } from '../../hooks/use_profiling_router';
import { asPercentage } from '../../utils/formatters/as_percentage';

interface Props {
  data?: StorageExplorerSummaryAPIResponse;
  isLoading: boolean;
}

interface SummaryInfo {
  title: string;
  value?: string | number;
  hint?: string;
  dataTestSubj?: string;
}

export function Summary({ data, isLoading }: Props) {
  const { query } = useProfilingParams('/storage-explorer');
  const { rangeFrom, rangeTo, kuery } = query;
  const profilingRouter = useProfilingRouter();
  const {
    start: { core },
  } = useProfilingDependencies();

  const summaryInfo: SummaryInfo[] = [
    {
      dataTestSubj: 'totalData',
      title: i18n.translate('xpack.profiling.storageExplorer.summary.totalData', {
        defaultMessage: 'Total data',
      }),
      value: data?.totalProfilingSizeBytes
        ? asDynamicBytes(data?.totalProfilingSizeBytes)
        : undefined,
      hint: i18n.translate('xpack.profiling.storageExplorer.summary.totalData.hint', {
        defaultMessage:
          'Total storage size of all Universal Profiling indices including replicas, ignoring the filter settings.',
      }),
    },
    {
      dataTestSubj: 'dailyDataGeneration',
      title: i18n.translate('xpack.profiling.storageExplorer.summary.dailyDataGeneration', {
        defaultMessage: 'Daily data generation',
      }),
      value: data?.dailyDataGenerationBytes
        ? asDynamicBytes(data?.dailyDataGenerationBytes)
        : undefined,
    },
    {
      dataTestSubj: 'totalDebugSymbolsSize',
      title: i18n.translate('xpack.profiling.storageExplorer.summary.totalDebugSymbolsSize', {
        defaultMessage: 'Total debug symbols size',
      }),
      value: data?.totalSymbolsSizeBytes ? asDynamicBytes(data?.totalSymbolsSizeBytes) : undefined,
      hint: i18n.translate('xpack.profiling.storageExplorer.summary.totalDebugSymbolsSize.hint', {
        defaultMessage: 'The total sum of private and public debug symbols.',
      }),
    },
    {
      dataTestSubj: 'diskSpaceUsed',
      title: i18n.translate('xpack.profiling.storageExplorer.summary.discSpaceUsed', {
        defaultMessage: 'Disk space used',
      }),
      value: data?.diskSpaceUsedPct ? asPercentage(data?.diskSpaceUsedPct) : undefined,
      hint: i18n.translate('xpack.profiling.storageExplorer.summary.discSpaceUsed.hint', {
        defaultMessage:
          'The percentage of the storage capacity that is currently used by all of the Universal Profiling indices compared to the maximum storage capacity currently configured for Elasticsearch.',
      }),
    },
    {
      dataTestSubj: 'numberOfHostsAgents',
      title: i18n.translate('xpack.profiling.storageExplorer.summary.numberOfHosts', {
        defaultMessage: 'Number of host agents',
      }),
      value: data?.totalNumberOfHosts,
      hint: i18n.translate('xpack.profiling.storageExplorer.summary.numberOfHosts.hint', {
        defaultMessage:
          'Total number of Universal Profiling host agents reporting into the deployment.',
      }),
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
                  item.hint ? (
                    <LabelWithHint label={item.title} hint={item.hint} labelSize="xs" />
                  ) : (
                    <EuiText size="xs">{item.title}</EuiText>
                  )
                }
                titleSize="s"
                title={<span data-test-subj={item.dataTestSubj}>{item.value}</span>}
                isLoading={isLoading}
              />
            </EuiFlexItem>
          );
        })}
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="column">
            <EuiFlexItem grow={false}>
              <EuiLink
                data-test-subj="profilingSummaryGoToUniversalProfilingLink"
                href={profilingRouter.link('/stacktraces/{topNType}', {
                  path: { topNType: TopNType.Hosts },
                  query: {
                    rangeFrom,
                    rangeTo,
                    kuery,
                    limit: 10,
                    displayAs: StackTracesDisplayOption.StackTraces,
                  },
                })}
              >
                {i18n.translate('xpack.profiling.storageExplorer.summary.universalProfilingLink', {
                  defaultMessage: 'Go to Universal Profiling',
                })}
              </EuiLink>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiLink
                data-test-subj="profilingSummaryGoToIndexManagementLink"
                href={core.http.basePath.prepend(
                  '/app/management/data/index_management/data_streams'
                )}
              >
                {i18n.translate('xpack.profiling.storageExplorer.summary.indexManagement', {
                  defaultMessage: 'Go to Index Management',
                })}
              </EuiLink>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
