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
  EuiLoadingContent,
  EuiSpacer,
} from '@elastic/eui';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { isEmpty } from 'lodash';
import { useProgressiveFetcher } from '../../../hooks/use_progressive_fetcher';
import { useTimeRange } from '../../../hooks/use_time_range';
import { useApmParams } from '../../../hooks/use_apm_params';
import { asDynamicBytes, asPercent } from '../../../../common/utils/formatters';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { asTransactionRate } from '../../../../common/utils/formatters';
import { getIndexManagementHref } from './get_storage_explorer_links';

export function SummaryStats() {
  const router = useApmRouter();
  const { core } = useApmPluginContext();

  const {
    query: {
      rangeFrom,
      rangeTo,
      environment,
      kuery,
      indexLifecyclePhase,
      comparisonEnabled,
    },
  } = useApmParams('/storage-explorer');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

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

  const { data, status } = useProgressiveFetcher(
    (callApmApi) => {
      return callApmApi('GET /internal/apm/storage_explorer_summary_stats', {
        params: {
          query: {
            indexLifecyclePhase,
            environment,
            kuery,
            start,
            end,
          },
        },
      });
    },
    [indexLifecyclePhase, environment, kuery, start, end]
  );

  const loading =
    status === FETCH_STATUS.LOADING || status === FETCH_STATUS.NOT_INITIATED;

  const hasData = !isEmpty(data);

  return (
    <EuiPanel
      hasBorder={true}
      hasShadow={false}
      paddingSize="l"
      style={{ position: 'relative' }}
    >
      {loading && <EuiProgress size="xs" color="accent" position="absolute" />}
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="xl">
            <SummaryMetric
              label={i18n.translate(
                'xpack.apm.storageExplorer.summary.totalSize',
                {
                  defaultMessage: 'Total APM size',
                }
              )}
              tooltipContent={i18n.translate(
                'xpack.apm.storageExplorer.summary.totalSize.tooltip',
                {
                  defaultMessage:
                    'Total storage size of all the APM indices currently, ignoring all filters.',
                }
              )}
              value={asDynamicBytes(data?.totalSize)}
              loading={loading}
              hasData={hasData}
            />
            <SummaryMetric
              label={i18n.translate(
                'xpack.apm.storageExplorer.summary.diskSpaceUsedPct',
                {
                  defaultMessage: 'Disk space used',
                }
              )}
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
              label={i18n.translate(
                'xpack.apm.storageExplorer.summary.incrementalSize',
                {
                  defaultMessage: 'Incremental APM size',
                }
              )}
              tooltipContent={i18n.translate(
                'xpack.apm.storageExplorer.summary.incrementalSize.tooltip',
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
              label={i18n.translate(
                'xpack.apm.storageExplorer.summary.dailyDataGeneration',
                {
                  defaultMessage: 'Daily data generation',
                }
              )}
              value={asDynamicBytes(data?.dailyDataGeneration)}
              loading={loading}
              hasData={hasData}
            />
            <SummaryMetric
              label={i18n.translate(
                'xpack.apm.storageExplorer.summary.tracesPerMinute',
                {
                  defaultMessage: 'Traces per minute',
                }
              )}
              value={asTransactionRate(data?.tracesPerMinute)}
              loading={loading}
              hasData={hasData}
            />
            <SummaryMetric
              label={i18n.translate(
                'xpack.apm.storageExplorer.summary.numberOfServices',
                {
                  defaultMessage: 'Number of services',
                }
              )}
              value={(data?.numberOfServices ?? 0).toString()}
              loading={loading}
              hasData={hasData}
            />
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="column" justifyContent="spaceBetween">
            <EuiFlexItem>
              <EuiLink href={serviceInventoryLink}>
                {i18n.translate(
                  'xpack.apm.storageExplorer.summary.serviceInventoryLink',
                  {
                    defaultMessage: 'Go to Service Inventory',
                  }
                )}
              </EuiLink>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLink href={getIndexManagementHref(core)}>
                {i18n.translate(
                  'xpack.apm.storageExplorer.summary.indexManagementLink',
                  {
                    defaultMessage: 'Go to Index Management',
                  }
                )}
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
  const xlFontSize = useEuiFontSize('xl', { measurement: 'px' });
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexItem grow={false}>
      {tooltipContent ? (
        <EuiToolTip content={tooltipContent}>
          <EuiText size="s" color="subdued">
            {label}{' '}
            <EuiIcon
              size="s"
              color="subdued"
              type="questionInCircle"
              className="eui-alignTop"
            />
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
          <EuiLoadingContent lines={2} />
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
