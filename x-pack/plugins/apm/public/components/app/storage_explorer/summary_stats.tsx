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
  EuiLoadingSpinner,
} from '@elastic/eui';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useProgressiveFetcher } from '../../../hooks/use_progressive_fetcher';
import { useTimeRange } from '../../../hooks/use_time_range';
import { useApmParams } from '../../../hooks/use_apm_params';
import { asDynamicBytes } from '../../../../common/utils/formatters';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { asTransactionRate } from '../../../../common/utils/formatters';

const INITIAL_DATA = {
  estimatedSize: 0,
  dailyDataGeneration: 0,
  tracesPerMinute: 0,
  numberOfServices: 0,
};

export function SummaryStats() {
  const router = useApmRouter();
  const { core } = useApmPluginContext();
  const { euiTheme } = useEuiTheme();

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

  const { data = INITIAL_DATA, status } = useProgressiveFetcher(
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

  const loading = status === FETCH_STATUS.LOADING;

  return (
    <EuiPanel hasBorder={true} hasShadow={false} paddingSize="l">
      {loading && (
        <EuiText textAlign="center">
          <EuiLoadingSpinner size="l" />
        </EuiText>
      )}
      {!loading && (
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
                value={asDynamicBytes(data?.estimatedSize)}
                color={euiTheme.colors.primary}
              />
              <SummaryMetric
                label={i18n.translate(
                  'xpack.apm.storageExplorer.summary.dailyDataGeneration',
                  {
                    defaultMessage: 'Daily data generation',
                  }
                )}
                value={asDynamicBytes(data?.dailyDataGeneration)}
                color={euiTheme.colors.danger}
              />
              <SummaryMetric
                label={i18n.translate(
                  'xpack.apm.storageExplorer.summary.tracesPerMinute',
                  {
                    defaultMessage: 'Traces per minute',
                  }
                )}
                value={asTransactionRate(data?.tracesPerMinute)}
                color={euiTheme.colors.accent}
              />
              <SummaryMetric
                label={i18n.translate(
                  'xpack.apm.storageExplorer.summary.numberOfServices',
                  {
                    defaultMessage: 'Number of services',
                  }
                )}
                value={data?.numberOfServices.toString()}
                color={euiTheme.colors.success}
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
                <EuiLink
                  href={core.http.basePath.prepend(
                    '/app/management/data/index_management/data_streams'
                  )}
                >
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
      )}
    </EuiPanel>
  );
}

function SummaryMetric({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  const xxlFontSize = useEuiFontSize('xxl', { measurement: 'px' });
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexItem grow={false}>
      <EuiText size="s" color="subdued">
        {label}
      </EuiText>
      <EuiText
        css={css`
          ${xxlFontSize}
          font-weight: ${euiTheme.font.weight.bold};
          color: ${color};
        `}
      >
        {value}
      </EuiText>
    </EuiFlexItem>
  );
}
