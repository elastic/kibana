/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  useEuiFontSize,
  EuiLink,
  EuiToolTip,
  EuiIcon,
  EuiProgress,
  EuiSkeletonText,
  EuiSpacer,
} from '@elastic/eui';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useApmParams } from '../../../hooks/use_apm_params';
import { asDynamicBytes, asPercent } from '../../../../common/utils/formatters';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';

import { asTransactionRate } from '../../../../common/utils/formatters';
import { getIndexManagementHref } from './get_storage_explorer_links';
import { APIReturnType } from '../../../services/rest/create_call_apm_api';

interface Props {
  data?: APIReturnType<'GET /internal/apm/storage_explorer_summary_stats'>;
  loading: boolean;
  hasData: boolean;
}

export function SummaryStats({ data, loading, hasData }: Props) {
  const router = useApmRouter();
  const { core } = useApmPluginContext();

  const {
    query: { rangeFrom, rangeTo, environment, kuery, comparisonEnabled },
  } = useApmParams('/storage-explorer');

  const serviceInventoryLink = router.link('/services', {
    query: {
      rangeFrom,
      rangeTo,
      environment,
      comparisonEnabled,
      kuery,
      serviceGroup: '',
    },
  });

  return (
    <EuiPanel hasBorder={true} hasShadow={false} paddingSize="l" style={{ position: 'relative' }}>
      {loading && <EuiProgress size="xs" color="accent" position="absolute" />}
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="xl">
            <SummaryMetric
              label={i18n.translate('xpack.apm.storageExplorer.summary.totalSize', {
                defaultMessage: 'Total APM size',
              })}
              tooltipContent={i18n.translate(
                'xpack.apm.storageExplorer.summary.totalSize.tooltip',
                {
                  defaultMessage:
                    'Total storage size of all APM indices including replicas, ignoring the filter settings.',
                }
              )}
              value={asDynamicBytes(data?.totalSize)}
              loading={loading}
              hasData={hasData}
            />
            <SummaryMetric
              label={i18n.translate('xpack.apm.storageExplorer.summary.diskSpaceUsedPct', {
                defaultMessage: 'Relative disk space used',
              })}
              tooltipContent={i18n.translate(
                'xpack.apm.storageExplorer.summary.diskSpaceUsedPct.tooltip',
                {
                  defaultMessage:
                    'The percentage of the storage capacity that is currently used by all the APM indices compared to the max. storage capacity currently configured for Elasticsearch.',
                }
              )}
              value={asPercent(data?.diskSpaceUsedPct, 1)}
              loading={loading}
              hasData={hasData}
            />
            <SummaryMetric
              label={i18n.translate('xpack.apm.storageExplorer.summary.deltaInSize', {
                defaultMessage: 'Delta in APM size',
              })}
              tooltipContent={i18n.translate(
                'xpack.apm.storageExplorer.summary.deltaInSize.tooltip',
                {
                  defaultMessage:
                    'The estimated storage size used by the APM indices based on the filters selected.',
                }
              )}
              value={asDynamicBytes(data?.estimatedIncrementalSize)}
              loading={loading}
              hasData={hasData}
            />
            <SummaryMetric
              label={i18n.translate('xpack.apm.storageExplorer.summary.dailyDataGeneration', {
                defaultMessage: 'Daily data generation',
              })}
              value={asDynamicBytes(data?.dailyDataGeneration)}
              loading={loading}
              hasData={hasData}
            />
            <SummaryMetric
              label={i18n.translate('xpack.apm.storageExplorer.summary.tracesPerMinute', {
                defaultMessage: 'Traces per minute',
              })}
              value={asTransactionRate(data?.tracesPerMinute)}
              loading={loading}
              hasData={hasData}
            />
            <SummaryMetric
              label={i18n.translate('xpack.apm.storageExplorer.summary.numberOfServices', {
                defaultMessage: 'Number of services',
              })}
              value={(data?.numberOfServices ?? 0).toString()}
              loading={loading}
              hasData={hasData}
            />
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="column" justifyContent="spaceBetween">
            <EuiFlexItem>
              <EuiLink
                data-test-subj="apmSummaryStatsGoToServiceInventoryLink"
                href={serviceInventoryLink}
              >
                {i18n.translate('xpack.apm.storageExplorer.summary.serviceInventoryLink', {
                  defaultMessage: 'Go to Service Inventory',
                })}
              </EuiLink>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLink
                data-test-subj="apmSummaryStatsGoToIndexManagementLink"
                href={getIndexManagementHref(core)}
              >
                {i18n.translate('xpack.apm.storageExplorer.summary.indexManagementLink', {
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

function SummaryMetric({
  label,
  value,
  tooltipContent,
  loading,
  hasData,
}: {
  label: string;
  value: string;
  tooltipContent?: string;
  loading: boolean;
  hasData: boolean;
}) {
  const xlFontSize = useEuiFontSize('xl', { unit: 'px' });
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexItem grow={false}>
      {tooltipContent ? (
        <EuiToolTip content={tooltipContent}>
          <EuiText size="s" color="subdued">
            {label}{' '}
            <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
          </EuiText>
        </EuiToolTip>
      ) : (
        <EuiText size="s" color="subdued">
          {label}
        </EuiText>
      )}
      {loading && !hasData && (
        <>
          <EuiSpacer size="s" />
          <EuiSkeletonText lines={2} />
        </>
      )}
      {hasData && (
        <EuiText
          css={css`
            ${xlFontSize}
            font-weight: ${euiTheme.font.weight.bold};
            color: ${euiTheme.colors.text};
          `}
        >
          {value}
        </EuiText>
      )}
    </EuiFlexItem>
  );
}
