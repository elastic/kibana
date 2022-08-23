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
} from '@elastic/eui';
import { useChartTheme } from '@kbn/observability-plugin/public';
import { Chart, Partition, Settings, Datum } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { sumBy } from 'lodash';
import { IndexLifecyclePhaseSelectOption } from '../../../../../../common/storage_explorer_types';
import { useApmParams } from '../../../../../hooks/use_apm_params';
import { useTimeRange } from '../../../../../hooks/use_time_range';
import { FETCH_STATUS } from '../../../../../hooks/use_fetcher';
import { useProgressiveFetcher } from '../../../../../hooks/use_progressive_fetcher';
import { useApmRouter } from '../../../../../hooks/use_apm_router';
import {
  asInteger,
  asPercent,
} from '../../../../../../common/utils/formatters/formatters';
import { NOT_AVAILABLE_LABEL } from '../../../../../../common/i18n';
import { asDynamicBytes } from '../../../../../../common/utils/formatters';
import { getComparisonEnabled } from '../../../../shared/time_comparison/get_comparison_enabled';
import { useApmPluginContext } from '../../../../../context/apm_plugin/use_apm_plugin_context';

interface Props {
  serviceName: string;
  indexLifecyclePhase: IndexLifecyclePhaseSelectOption;
}

const ProcessorEventLabelMap = {
  [ProcessorEvent.transaction]: i18n.translate(
    'xpack.apm.settings.storageExplorer.serviceDetails.transactions',
    {
      defaultMessage: 'Transactions',
    }
  ),
  [ProcessorEvent.span]: i18n.translate(
    'xpack.apm.settings.storageExplorer.serviceDetails.spans',
    {
      defaultMessage: 'Spans',
    }
  ),
  [ProcessorEvent.metric]: i18n.translate(
    'xpack.apm.settings.storageExplorer.serviceDetails.metrics',
    {
      defaultMessage: 'Metrics',
    }
  ),
  [ProcessorEvent.error]: i18n.translate(
    'xpack.apm.settings.storageExplorer.serviceDetails.errors',
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

  const { query } = useApmParams('/settings/storage-explorer');
  const { rangeFrom, rangeTo, environment, kuery } = query;

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const serviceOverviewLink = router.link('/services/{serviceName}/overview', {
    path: {
      serviceName,
    },
    query: {
      ...query,
      serviceGroup: '',
      comparisonEnabled: getComparisonEnabled({ core }),
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

  if (
    status === FETCH_STATUS.LOADING ||
    status === FETCH_STATUS.NOT_INITIATED
  ) {
    return (
      <div style={{ width: '50%' }}>
        <EuiLoadingContent data-test-subj="loadingSpinner" />
      </div>
    );
  }

  if (!data || !data.processorEventStats) {
    return null;
  }

  const serviceDocs = sumBy(data.processorEventStats, 'docs');

  return (
    <>
      <EuiFlexGroup direction="column" responsive={false} gutterSize="xl">
        <EuiFlexItem>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem>
              <EuiTitle size="xxs">
                <h4>
                  {i18n.translate(
                    'xpack.apm.settings.storageExplorer.serviceDetails.title',
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
                  'xpack.apm.settings.storageExplorer.serviceDetails.serviceOverviewLink',
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
              <EuiPanel hasShadow={false}>
                <Chart>
                  <Settings theme={chartTheme} showLegend />
                  <Partition
                    id="storageExplorerSizeByProcessorType"
                    data={data.processorEventStats}
                    valueAccessor={(d) => d.size ?? 0}
                    valueFormatter={(d: number) =>
                      asDynamicBytes(d) || NOT_AVAILABLE_LABEL
                    }
                    layers={[
                      {
                        groupByRollup: (d: Datum) => d.processorEvent,
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
              <EuiPanel hasShadow={false} paddingSize="xl">
                {data.processorEventStats.map(({ processorEvent, docs }) => (
                  <>
                    <EuiFlexGrid
                      columns={2}
                      css={css`
                        font-weight: bold;
                      `}
                    >
                      <EuiFlexItem>
                        {ProcessorEventLabelMap[processorEvent]}
                      </EuiFlexItem>
                      <EuiFlexItem>
                        {i18n.translate(
                          'xpack.apm.settings.storageExplorer.serviceDetails.ratio',
                          {
                            defaultMessage: 'Ratio',
                          }
                        )}
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
                      <EuiFlexItem>
                        {asPercent(docs / serviceDocs, 1)}
                      </EuiFlexItem>
                    </EuiFlexGrid>
                  </>
                ))}
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
