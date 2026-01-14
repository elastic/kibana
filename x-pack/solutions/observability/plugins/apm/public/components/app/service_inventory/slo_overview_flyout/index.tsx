/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn, EuiSelectableOption } from '@elastic/eui';
import {
  EuiBadge,
  EuiBasicTable,
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiPopover,
  EuiSelectable,
  EuiSpacer,
  EuiStat,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import numeral from '@elastic/numeral';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import rison from '@kbn/rison';
import { AgentIcon } from '@kbn/custom-icons';
import type { ApmPluginStartDeps } from '../../../../plugin';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { useApmParams } from '../../../../hooks/use_apm_params';

type SloStatusFilter = 'VIOLATED' | 'DEGRADING' | 'HEALTHY' | 'NO_DATA';

interface Props {
  serviceName: string;
  agentName?: string;
  onClose: () => void;
}

const STATUS_OPTIONS: Array<{ label: string; value: SloStatusFilter }> = [
  {
    value: 'VIOLATED',
    label: i18n.translate('xpack.apm.sloOverviewFlyout.statusFilter.violated', {
      defaultMessage: 'Violated',
    }),
  },
  {
    value: 'DEGRADING',
    label: i18n.translate('xpack.apm.sloOverviewFlyout.statusFilter.degrading', {
      defaultMessage: 'Degrading',
    }),
  },
  {
    value: 'HEALTHY',
    label: i18n.translate('xpack.apm.sloOverviewFlyout.statusFilter.healthy', {
      defaultMessage: 'Healthy',
    }),
  },
  {
    value: 'NO_DATA',
    label: i18n.translate('xpack.apm.sloOverviewFlyout.statusFilter.noData', {
      defaultMessage: 'No data',
    }),
  },
];

const statusColors: Record<string, string> = {
  VIOLATED: 'danger',
  DEGRADING: 'warning',
  HEALTHY: 'success',
  NO_DATA: 'default',
};

export function SloOverviewFlyout({ serviceName, agentName, onClose }: Props) {
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'sloOverviewFlyout' });
  const { euiTheme } = useEuiTheme();
  const { http, uiSettings, slo } = useKibana<ApmPluginStartDeps>().services;
  const { link } = useApmRouter();
  const { query } = useApmParams('/services');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<SloStatusFilter[]>([]);
  const [isStatusPopoverOpen, setIsStatusPopoverOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sloData, setSloData] = useState<SLOWithSummaryResponse[]>([]);
  const [selectedSloId, setSelectedSloId] = useState<string | null>(null);
  const percentFormat = uiSettings?.get('format:percent:defaultPattern') ?? '0.00%';

  const filtersQuery = useMemo(() => {
    return JSON.stringify({
      must: [],
      filter: [
        { match_phrase: { 'service.name': serviceName } },
        {
          bool: {
            minimum_should_match: 1,
            should: [
              { match_phrase: { 'slo.indicator.type': 'sli.apm.transactionDuration' } },
              { match_phrase: { 'slo.indicator.type': 'sli.apm.transactionErrorRate' } },
            ],
          },
        },
      ],
      should: [],
      must_not: [],
    });
  }, [serviceName]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    http
      ?.fetch<{ results: SLOWithSummaryResponse[]; total: number }>('/api/observability/slos', {
        method: 'GET',
        version: '2023-10-31',
        query: {
          filters: filtersQuery,
          perPage: '100',
          sortBy: 'status',
          sortDirection: 'desc',
          hideStale: 'true',
        },
      })
      .then((response) => {
        if (isMounted) {
          setSloData(response.results);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setSloData([]);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [http, filtersQuery]);

  const statusCounts = useMemo(() => {
    const counts = {
      VIOLATED: 0,
      DEGRADING: 0,
      HEALTHY: 0,
      STALE: 0,
      NO_DATA: 0,
    };
    sloData.forEach((sloItem) => {
      const status = sloItem.summary?.status;
      if (status && status in counts) {
        counts[status as keyof typeof counts]++;
      }
    });
    return counts;
  }, [sloData]);

  const filteredSlos = useMemo(() => {
    if (!sloData.length) return [];

    return sloData.filter((sloItem) => {
      if (
        selectedStatuses.length > 0 &&
        !selectedStatuses.includes(sloItem.summary?.status as SloStatusFilter)
      ) {
        return false;
      }

      if (searchQuery && !sloItem.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [sloData, selectedStatuses, searchQuery]);

  const sloAppUrl = useMemo(() => {
    const searchParams = rison.encode({
      filters: [
        {
          meta: {
            alias: null,
            disabled: false,
            key: 'service.name',
            negate: false,
            params: { query: serviceName },
            type: 'phrase',
          },
          query: {
            match_phrase: { 'service.name': serviceName },
          },
        },
        {
          meta: {
            alias: null,
            disabled: false,
            key: 'slo.indicator.type',
            negate: false,
            params: ['sli.apm.transactionDuration', 'sli.apm.transactionErrorRate'],
            type: 'phrases',
          },
          query: {
            bool: {
              minimum_should_match: 1,
              should: [
                { match_phrase: { 'slo.indicator.type': 'sli.apm.transactionDuration' } },
                { match_phrase: { 'slo.indicator.type': 'sli.apm.transactionErrorRate' } },
              ],
            },
          },
        },
      ],
    });
    return http?.basePath.prepend(`/app/slos?search=${searchParams}`);
  }, [http?.basePath, serviceName]);

  const serviceOverviewUrl = useMemo(() => {
    return link('/services/{serviceName}/overview', {
      path: { serviceName },
      query,
    });
  }, [link, serviceName, query]);

  const statusSelectableOptions: EuiSelectableOption[] = useMemo(() => {
    return STATUS_OPTIONS.map((option) => ({
      label: option.label,
      key: option.value,
      checked: selectedStatuses.includes(option.value) ? 'on' : undefined,
    }));
  }, [selectedStatuses]);

  const handleStatusFilterChange = useCallback((options: EuiSelectableOption[]) => {
    const selected = options
      .filter((option) => option.checked === 'on')
      .map((option) => option.key as SloStatusFilter);
    setSelectedStatuses(selected);
  }, []);

  const handleSloClick = useCallback((sloId: string) => {
    setSelectedSloId(sloId);
  }, []);

  const handleCloseSloDetails = useCallback(() => {
    setSelectedSloId(null);
  }, []);

  const columns: Array<EuiBasicTableColumn<SLOWithSummaryResponse>> = useMemo(
    () => [
      {
        field: 'summary.status',
        name: i18n.translate('xpack.apm.sloOverviewFlyout.columns.status', {
          defaultMessage: 'Status',
        }),
        width: '90px',
        render: (status: string) => (
          <EuiBadge color={statusColors[status] || 'default'}>
            {status === 'NO_DATA' ? 'No data' : status.charAt(0) + status.slice(1).toLowerCase()}
          </EuiBadge>
        ),
      },
      {
        field: 'name',
        name: i18n.translate('xpack.apm.sloOverviewFlyout.columns.name', {
          defaultMessage: 'Name',
        }),
        truncateText: true,
        render: (name: string, sloItem: SLOWithSummaryResponse) => (
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type="visGauge" size="s" color="subdued" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiLink data-test-subj="apmSloNameLink" onClick={() => handleSloClick(sloItem.id)}>
                {name}
              </EuiLink>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      },
      {
        field: 'summary.sliValue',
        name: i18n.translate('xpack.apm.sloOverviewFlyout.columns.sliValue', {
          defaultMessage: 'SLI Value',
        }),
        width: '90px',
        render: (sliValue: number, sloItem: SLOWithSummaryResponse) => {
          if (sloItem.summary?.status === 'NO_DATA') return '-';
          return numeral(sliValue).format(percentFormat);
        },
      },
      {
        field: 'objective.target',
        name: i18n.translate('xpack.apm.sloOverviewFlyout.columns.objective', {
          defaultMessage: 'Objective',
        }),
        width: '80px',
        render: (target: number) => numeral(target).format(percentFormat),
      },
    ],
    [handleSloClick, percentFormat]
  );

  const activeFiltersCount = selectedStatuses.length;

  return (
    <EuiFlyout onClose={onClose} aria-labelledby={flyoutTitleId} size="s" ownFocus session="start">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={flyoutTitleId}>
            <EuiLink href={sloAppUrl} target="_blank" data-test-subj="sloOverviewFlyoutSloLink">
              {i18n.translate('xpack.apm.sloOverviewFlyout.title', {
                defaultMessage: 'SLOs',
              })}
            </EuiLink>
          </h2>
        </EuiTitle>

        <EuiSpacer size="m" />

        <EuiBadge
          href={serviceOverviewUrl}
          color="hollow"
          css={{ color: euiTheme.colors.primaryText }}
          data-test-subj="sloOverviewFlyoutServiceLink"
        >
          <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
            {agentName && (
              <EuiFlexItem grow={false}>
                <AgentIcon agentName={agentName} size="s" role="presentation" />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>{serviceName}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiBadge>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiPanel hasBorder paddingSize="m">
          <EuiFlexGroup gutterSize="l" responsive={false} justifyContent="spaceBetween">
            <EuiFlexItem grow>
              <EuiStat
                title={statusCounts.VIOLATED}
                titleSize="s"
                titleColor="danger"
                description={i18n.translate('xpack.apm.sloOverviewFlyout.stats.violated', {
                  defaultMessage: 'Violated',
                })}
                isLoading={isLoading}
                reverse
              />
            </EuiFlexItem>
            <EuiFlexItem grow>
              <EuiStat
                title={statusCounts.DEGRADING}
                titleSize="s"
                titleColor="warning"
                description={i18n.translate('xpack.apm.sloOverviewFlyout.stats.degrading', {
                  defaultMessage: 'Degrading',
                })}
                isLoading={isLoading}
                reverse
              />
            </EuiFlexItem>
            <EuiFlexItem grow>
              <EuiStat
                title={statusCounts.HEALTHY}
                titleSize="s"
                titleColor="success"
                description={i18n.translate('xpack.apm.sloOverviewFlyout.stats.healthy', {
                  defaultMessage: 'Healthy',
                })}
                isLoading={isLoading}
                reverse
              />
            </EuiFlexItem>
            <EuiFlexItem grow>
              <EuiStat
                title={statusCounts.STALE}
                titleSize="s"
                description={i18n.translate('xpack.apm.sloOverviewFlyout.stats.stale', {
                  defaultMessage: 'Stale',
                })}
                isLoading={isLoading}
                reverse
              />
            </EuiFlexItem>
            <EuiFlexItem grow>
              <EuiStat
                title={statusCounts.NO_DATA}
                titleSize="s"
                description={i18n.translate('xpack.apm.sloOverviewFlyout.stats.noData', {
                  defaultMessage: 'No data',
                })}
                isLoading={isLoading}
                reverse
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>

        <EuiSpacer size="m" />

        <EuiFlexGroup gutterSize="s" responsive={false}>
          <EuiFlexItem>
            <EuiFieldSearch
              placeholder={i18n.translate('xpack.apm.sloOverviewFlyout.searchPlaceholder', {
                defaultMessage: 'Search APM SLOs...',
              })}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              isClearable
              fullWidth
              compressed
              data-test-subj="sloOverviewFlyoutSearch"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFilterGroup compressed>
              <EuiPopover
                button={
                  <EuiFilterButton
                    iconType="filter"
                    onClick={() => setIsStatusPopoverOpen(!isStatusPopoverOpen)}
                    isSelected={isStatusPopoverOpen}
                    hasActiveFilters={activeFiltersCount > 0}
                    numActiveFilters={activeFiltersCount}
                    data-test-subj="sloOverviewFlyoutStatusFilterButton"
                  >
                    {i18n.translate('xpack.apm.sloOverviewFlyout.statusFilterButton', {
                      defaultMessage: 'Status',
                    })}
                  </EuiFilterButton>
                }
                isOpen={isStatusPopoverOpen}
                closePopover={() => setIsStatusPopoverOpen(false)}
                panelPaddingSize="none"
                anchorPosition="downLeft"
              >
                <EuiSelectable
                  options={statusSelectableOptions}
                  onChange={handleStatusFilterChange}
                  data-test-subj="sloOverviewFlyoutStatusSelectable"
                >
                  {(list) => <div style={{ width: 180 }}>{list}</div>}
                </EuiSelectable>
              </EuiPopover>
            </EuiFilterGroup>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        <EuiBasicTable<SLOWithSummaryResponse>
          items={filteredSlos}
          columns={columns}
          loading={isLoading}
          tableCaption={i18n.translate('xpack.apm.sloOverviewFlyout.tableCaption', {
            defaultMessage: 'APM SLOs for service {serviceName}',
            values: { serviceName },
          })}
          rowHeader="name"
          noItemsMessage={
            isLoading
              ? i18n.translate('xpack.apm.sloOverviewFlyout.loading', {
                  defaultMessage: 'Loading SLOs...',
                })
              : i18n.translate('xpack.apm.sloOverviewFlyout.noSlos', {
                  defaultMessage: 'No SLOs found for this service',
                })
          }
          data-test-subj="sloOverviewFlyoutTable"
        />
      </EuiFlyoutBody>
      {selectedSloId && slo?.getSLODetailsFlyout && (
        <slo.getSLODetailsFlyout
          sloId={selectedSloId}
          onClose={handleCloseSloDetails}
          size="m"
          hideFooter
          session="inherit"
        />
      )}
    </EuiFlyout>
  );
}
