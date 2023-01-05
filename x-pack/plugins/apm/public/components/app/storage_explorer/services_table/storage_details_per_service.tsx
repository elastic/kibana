/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiLoadingContent,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  euiPaletteColorBlind,
  EuiPanel,
  EuiFlexGrid,
  EuiSpacer,
} from '@elastic/eui';
import { useChartTheme } from '@kbn/observability-plugin/public';
import {
  Chart,
  Partition,
  Settings,
  Datum,
  PartitionLayout,
} from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { IndexLifecyclePhaseSelectOption } from '../../../../../common/storage_explorer_types';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { isPending } from '../../../../hooks/use_fetcher';
import { useProgressiveFetcher } from '../../../../hooks/use_progressive_fetcher';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { asInteger } from '../../../../../common/utils/formatters/formatters';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import { asDynamicBytes } from '../../../../../common/utils/formatters';
import { getComparisonEnabled } from '../../../shared/time_comparison/get_comparison_enabled';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { SizeLabel } from './size_label';
import { IndexStatsPerService } from './index_stats_per_service';

interface Props {
  serviceName: string;
  indexLifecyclePhase: IndexLifecyclePhaseSelectOption;
}

const ProcessorEventLabelMap = {
  [ProcessorEvent.transaction]: i18n.translate(
    'xpack.apm.storageExplorer.serviceDetails.transactions',
    {
      defaultMessage: 'Transactions',
    }
  ),
  [ProcessorEvent.span]: i18n.translate(
    'xpack.apm.storageExplorer.serviceDetails.spans',
    {
      defaultMessage: 'Spans',
    }
  ),
  [ProcessorEvent.metric]: i18n.translate(
    'xpack.apm.storageExplorer.serviceDetails.metrics',
    {
      defaultMessage: 'Metrics',
    }
  ),
  [ProcessorEvent.error]: i18n.translate(
    'xpack.apm.storageExplorer.serviceDetails.errors',
    {
      defaultMessage: 'Errors',
    }
  ),
};

export function StorageDetailsPerService({
  serviceName,
  indexLifecyclePhase,
}: Props) {
  const { core } = useApmPluginContext();
  const chartTheme = useChartTheme();
  const router = useApmRouter();
  const { euiTheme } = useEuiTheme();

  const { query } = useApmParams('/storage-explorer');
  const {
    rangeFrom,
    rangeTo,
    environment,
    kuery,
    comparisonEnabled: urlComparisonEnabled,
  } = query;

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const serviceOverviewLink = router.link('/services/{serviceName}/overview', {
    path: {
      serviceName,
    },
    query: {
      ...query,
      serviceGroup: '',
      comparisonEnabled: getComparisonEnabled({ core, urlComparisonEnabled }),
    },
  });

  const groupedPalette = euiPaletteColorBlind();

  const { data, status } = useProgressiveFetcher(
    (callApmApi) => {
      return callApmApi(
        'GET /internal/apm/services/{serviceName}/storage_details',
        {
          params: {
            path: {
              serviceName,
            },
            query: {
              indexLifecyclePhase,
              start,
              end,
              environment,
              kuery,
            },
          },
        }
      );
    },
    [indexLifecyclePhase, start, end, environment, kuery, serviceName]
  );

  if (isPending(status)) {
    return (
      <div style={{ width: '50%' }}>
        <EuiLoadingContent data-test-subj="loadingSpinner" />
      </div>
    );
  }

  if (!data || !data.processorEventStats) {
    return null;
  }

  const processorEventStats = data.processorEventStats.map(
    ({ processorEvent, docs, size }) => ({
      processorEventLabel: ProcessorEventLabelMap[processorEvent],
      docs,
      size,
    })
  );

  return (
    <>
      <EuiFlexGroup direction="column" responsive={false} gutterSize="l">
        <EuiFlexItem>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem>
              <EuiTitle size="xs">
                <h4>
                  {i18n.translate(
                    'xpack.apm.storageExplorer.serviceDetails.title',
                    {
                      defaultMessage: 'Service storage details',
                    }
                  )}
                </h4>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiLink href={serviceOverviewLink}>
                {i18n.translate(
                  'xpack.apm.storageExplorer.serviceDetails.serviceOverviewLink',
                  {
                    defaultMessage: 'Go to service overview',
                  }
                )}
              </EuiLink>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFlexGroup justifyContent="spaceBetween" gutterSize="m">
            <EuiFlexItem>
              <EuiPanel
                hasShadow={false}
                data-test-subj="serviceStorageDetailsChart"
              >
                <Chart>
                  <Settings
                    theme={[
                      {
                        partition: {
                          fillLabel: {
                            textColor: euiTheme.colors.emptyShade,
                          },
                          emptySizeRatio: 0.3,
                        },
                      },
                      ...chartTheme,
                    ]}
                    showLegend
                  />
                  <Partition
                    layout={PartitionLayout.sunburst}
                    id="storageExplorerSizeByProcessorType"
                    data={processorEventStats}
                    valueAccessor={(d) => d.size ?? 0}
                    valueGetter="percent"
                    valueFormatter={(d: number) =>
                      asDynamicBytes(d) || NOT_AVAILABLE_LABEL
                    }
                    layers={[
                      {
                        groupByRollup: (d: Datum) => d.processorEventLabel,
                        shape: {
                          fillColor: (d) => groupedPalette[d.sortIndex],
                        },
                      },
                    ]}
                  />
                </Chart>
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel
                hasShadow={false}
                paddingSize="l"
                data-test-subj="serviceStorageDetailsTable"
              >
                {processorEventStats.map(
                  ({ processorEventLabel, docs, size }) => (
                    <>
                      <EuiFlexGrid
                        columns={2}
                        css={css`
                          font-weight: ${euiTheme.font.weight.semiBold};
                        `}
                      >
                        <EuiFlexItem>{processorEventLabel}</EuiFlexItem>
                        <EuiFlexItem>
                          <SizeLabel />
                        </EuiFlexItem>
                      </EuiFlexGrid>
                      <EuiFlexGrid
                        columns={2}
                        css={css`
                          background-color: ${euiTheme.colors.lightestShade};
                          border-top: 1px solid ${euiTheme.colors.lightShade};
                          border-bottom: 1px solid ${euiTheme.colors.lightShade};
                        `}
                      >
                        <EuiFlexItem>{asInteger(docs)}</EuiFlexItem>
                        <EuiFlexItem>{asDynamicBytes(size)}</EuiFlexItem>
                      </EuiFlexGrid>
                      <EuiSpacer />
                    </>
                  )
                )}
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <IndexStatsPerService
            indicesStats={data.indicesStats}
            status={status}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
