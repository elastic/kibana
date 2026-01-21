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
  EuiFilterGroup,
  EuiFilterButton,
  EuiPopover,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiTablePagination,
  EuiSelectable,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import numeral from '@elastic/numeral';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { ALL_VALUE } from '@kbn/slo-schema';
import rison from '@kbn/rison';
import { AgentIcon } from '@kbn/custom-icons';
import { BASE_RAC_ALERTS_API_PATH } from '@kbn/rule-registry-plugin/common';
import {
  AlertConsumers,
  SLO_RULE_TYPE_IDS,
} from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import type { SloTabId } from '@kbn/deeplinks-observability';
import { ALERTS_TAB_ID } from '@kbn/deeplinks-observability';
import type { AgentName } from '@kbn/elastic-agent-utils';
import type { ApmPluginStartDeps } from '../../../../plugin';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { useApmParams } from '../../../../hooks/use_apm_params';
type SloStatusFilter = 'VIOLATED' | 'DEGRADING' | 'HEALTHY' | 'NO_DATA';

const STATUS_OPTIONS: Array<{ label: string; value: SloStatusFilter }> = [
  {
    label: i18n.translate('xpack.apm.sloOverviewFlyout.statusFilter.violated', {
      defaultMessage: 'Violated',
    }),
    value: 'VIOLATED',
  },
  {
    label: i18n.translate('xpack.apm.sloOverviewFlyout.statusFilter.degrading', {
      defaultMessage: 'Degrading',
    }),
    value: 'DEGRADING',
  },
  {
    label: i18n.translate('xpack.apm.sloOverviewFlyout.statusFilter.healthy', {
      defaultMessage: 'Healthy',
    }),
    value: 'HEALTHY',
  },
  {
    label: i18n.translate('xpack.apm.sloOverviewFlyout.statusFilter.noData', {
      defaultMessage: 'No data',
    }),
    value: 'NO_DATA',
  },
];

interface Props {
  serviceName: string;
  agentName?: AgentName;
  onClose: () => void;
}

const statusColors: Record<string, string> = {
  VIOLATED: 'danger',
  DEGRADING: 'warning',
  HEALTHY: 'success',
  NO_DATA: 'default',
};

// Status priority for sorting (higher = more important)
const STATUS_PRIORITY: Record<string, number> = {
  VIOLATED: 3,
  DEGRADING: 2,
  NO_DATA: 1,
  HEALTHY: 0,
};

export function SloOverviewFlyout({ serviceName, agentName, onClose }: Props) {
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'sloOverviewFlyout' });
  const { euiTheme } = useEuiTheme();
  const { http, uiSettings, slo: sloPlugin } = useKibana<ApmPluginStartDeps>().services;
  const { link } = useApmRouter();
  const { query } = useApmParams('/services');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<SloStatusFilter[]>([]);
  const [isStatusPopoverOpen, setIsStatusPopoverOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sloData, setSloData] = useState<SLOWithSummaryResponse[]>([]);
  const [totalSlos, setTotalSlos] = useState(0);
  const [selectedSloId, setSelectedSloId] = useState<string | null>(null);
  const [selectedSloTabId, setSelectedSloTabId] = useState<SloTabId | undefined>(undefined);
  const [activeAlerts, setActiveAlerts] = useState<Map<string, number>>(new Map());
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const percentFormat = uiSettings?.get('format:percent:defaultPattern') ?? '0.00%';
  const { environment } = query;

  const filtersQuery = useMemo(() => {
    const filters: Array<Record<string, unknown>> = [
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
    ];

    if (environment && environment !== 'ENVIRONMENT_ALL') {
      filters.push({ match_phrase: { 'service.environment': environment } });
    }

    return JSON.stringify({
      must: [],
      filter: filters,
      should: [],
      must_not: [],
    });
  }, [serviceName, environment]);

  // Fetch SLOs and alerts in parallel
  useEffect(() => {
    if (!http) return;

    let isMounted = true;
    setIsLoading(true);

    const fetchSlosAndAlerts = async () => {
      try {
        // First fetch SLOs with pagination
        const sloResponse = await http.fetch<{ results: SLOWithSummaryResponse[]; total: number }>(
          '/api/observability/slos',
          {
            method: 'GET',
            version: '2023-10-31',
            query: {
              filters: filtersQuery,
              page: String(page + 1), // API uses 1-based indexing
              perPage: String(perPage),
              sortBy: 'status',
              sortDirection: 'desc',
            },
          }
        );

        if (!isMounted) return;

        const slos = sloResponse.results;
        const total = sloResponse.total;

        // Then fetch alerts for those SLOs in parallel
        if (slos.length > 0) {
          const sloIdsAndInstanceIds = slos.map(
            (sloItem) => [sloItem.id, sloItem.instanceId ?? ALL_VALUE] as [string, string]
          );

          const alertsResponse = await http
            .post<{
              aggregations?: {
                perSloId: {
                  buckets: Array<{
                    key: [string, string];
                    key_as_string: string;
                    doc_count: number;
                  }>;
                };
              };
            }>(`${BASE_RAC_ALERTS_API_PATH}/find`, {
              body: JSON.stringify({
                rule_type_ids: SLO_RULE_TYPE_IDS,
                consumers: [
                  AlertConsumers.SLO,
                  AlertConsumers.OBSERVABILITY,
                  AlertConsumers.ALERTS,
                ],
                size: 0,
                query: {
                  bool: {
                    filter: [
                      { range: { '@timestamp': { gte: 'now-24h' } } },
                      { term: { 'kibana.alert.status': 'active' } },
                    ],
                    should: sloIdsAndInstanceIds.map(([sloId, instanceId]) => ({
                      bool: {
                        filter: [
                          { term: { 'slo.id': sloId } },
                          ...(instanceId === ALL_VALUE
                            ? []
                            : [{ term: { 'slo.instanceId': instanceId } }]),
                        ],
                      },
                    })),
                    minimum_should_match: 1,
                  },
                },
                aggs: {
                  perSloId: {
                    multi_terms: {
                      size: 10000,
                      terms: [{ field: 'slo.id' }, { field: 'slo.instanceId' }],
                    },
                  },
                },
              }),
            })
            .catch(() => null); // Ignore alerts fetch errors

          if (isMounted && alertsResponse) {
            const alertsMap = new Map<string, number>();
            alertsResponse.aggregations?.perSloId?.buckets?.forEach((bucket) => {
              alertsMap.set(bucket.key_as_string, bucket.doc_count);
            });
            setActiveAlerts(alertsMap);
          }
        }

        if (isMounted) {
          setSloData(slos);
          setTotalSlos(total);
          setIsLoading(false);
        }
      } catch {
        if (isMounted) {
          setSloData([]);
          setTotalSlos(0);
          setIsLoading(false);
        }
      }
    };

    fetchSlosAndAlerts();

    return () => {
      isMounted = false;
    };
  }, [http, filtersQuery, page, perPage]);

  const getActiveAlertsForSlo = useCallback(
    (sloItem: SLOWithSummaryResponse) => {
      const key = `${sloItem.id}|${sloItem.instanceId ?? ALL_VALUE}`;
      return activeAlerts.get(key) ?? 0;
    },
    [activeAlerts]
  );

  const handleActiveAlertsClick = useCallback(
    (sloItem: SLOWithSummaryResponse) => {
      // If the same SLO is already open, just close the flyout
      if (selectedSloId === sloItem.id) {
        setSelectedSloTabId(undefined);
        setSelectedSloId(null);
        return;
      }

      // Force close any existing flyout first, then open the new one
      setSelectedSloTabId(undefined);
      setSelectedSloId(null);

      // Use requestAnimationFrame to ensure the flyout is unmounted before opening the new one
      requestAnimationFrame(() => {
        setSelectedSloTabId(ALERTS_TAB_ID);
        setSelectedSloId(sloItem.id);
      });
    },
    [selectedSloId]
  );

  const statusCounts = useMemo(() => {
    const counts = {
      VIOLATED: 0,
      DEGRADING: 0,
      HEALTHY: 0,
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

    const filtered = sloData.filter((sloItem) => {
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

    return filtered.sort((a, b) => {
      const alertsA = activeAlerts.get(`${a.id}|${a.instanceId ?? ALL_VALUE}`) ?? 0;
      const alertsB = activeAlerts.get(`${b.id}|${b.instanceId ?? ALL_VALUE}`) ?? 0;

      if (alertsA !== alertsB) {
        return alertsB - alertsA;
      }

      const statusPriorityA = STATUS_PRIORITY[a.summary?.status ?? 'HEALTHY'] ?? 0;
      const statusPriorityB = STATUS_PRIORITY[b.summary?.status ?? 'HEALTHY'] ?? 0;

      return statusPriorityB - statusPriorityA;
    });
  }, [sloData, selectedStatuses, searchQuery, activeAlerts]);

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

  const handleSloClick = useCallback(
    (sloId: string) => {
      // If the same SLO is already selected, force close and reopen to ensure flyout appears
      if (selectedSloId === sloId) {
        setSelectedSloId(null);
        setSelectedSloTabId(undefined);
        requestAnimationFrame(() => {
          setSelectedSloId(sloId);
        });
      } else if (selectedSloId) {
        // Different SLO - close current and open new one
        setSelectedSloId(null);
        setSelectedSloTabId(undefined);
        requestAnimationFrame(() => {
          setSelectedSloId(sloId);
        });
      } else {
        // No flyout open - just open it
        setSelectedSloId(sloId);
      }
    },
    [selectedSloId]
  );

  const handleCloseSloDetails = useCallback(() => {
    setSelectedSloId(null);
    setSelectedSloTabId(undefined);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handlePerPageChange = useCallback((newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(0); // Reset to first page when changing items per page
  }, []);

  const columns: Array<EuiBasicTableColumn<SLOWithSummaryResponse>> = useMemo(
    () => [
      {
        field: 'alerts',
        name: i18n.translate('xpack.apm.sloOverviewFlyout.columns.alerts', {
          defaultMessage: 'Alerts',
        }),
        width: '70px',
        render: (_: unknown, sloItem: SLOWithSummaryResponse) => {
          const alertCount = getActiveAlertsForSlo(sloItem);
          if (!alertCount) return null;
          return (
            <EuiToolTip
              position="top"
              content={i18n.translate('xpack.apm.sloOverviewFlyout.activeAlertsBadge.tooltip', {
                defaultMessage:
                  '{count, plural, one {# burn rate alert} other {# burn rate alerts}}, click to view.',
                values: { count: alertCount },
              })}
            >
              <EuiBadge
                iconType="warning"
                color="danger"
                onClick={() => handleActiveAlertsClick(sloItem)}
                onClickAriaLabel={i18n.translate(
                  'xpack.apm.sloOverviewFlyout.activeAlertsBadge.ariaLabel',
                  { defaultMessage: 'active alerts badge' }
                )}
                data-test-subj="apmSloActiveAlertsBadge"
                css={{ cursor: 'pointer' }}
              >
                {alertCount}
              </EuiBadge>
            </EuiToolTip>
          );
        },
      },
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
              <EuiIcon type="expand" size="s" color="subdued" />
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
    [getActiveAlertsForSlo, handleActiveAlertsClick, handleSloClick, percentFormat]
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
          css={{ color: euiTheme.colors.textPrimary }}
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

        <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
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

        {/* Results count */}
        {totalSlos > 0 && (
          <>
            <EuiText size="s">
              <FormattedMessage
                id="xpack.apm.sloOverviewFlyout.resultsCount"
                defaultMessage="Showing {currentCount} of {total} {slos}"
                values={{
                  currentCount: (
                    <strong>{`${page * perPage + 1}-${Math.min(
                      (page + 1) * perPage,
                      totalSlos
                    )}`}</strong>
                  ),
                  total: totalSlos,
                  slos: (
                    <strong>
                      <FormattedMessage
                        id="xpack.apm.sloOverviewFlyout.slos.label"
                        defaultMessage="SLOs"
                      />
                    </strong>
                  ),
                }}
              />
            </EuiText>
            <EuiSpacer size="s" />
          </>
        )}

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

        {/* Pagination */}
        {totalSlos > perPage && (
          <>
            <EuiSpacer size="m" />
            <EuiTablePagination
              pageCount={Math.ceil(totalSlos / perPage)}
              activePage={page}
              onChangePage={handlePageChange}
              itemsPerPage={perPage}
              itemsPerPageOptions={[10, 25, 50]}
              onChangeItemsPerPage={handlePerPageChange}
              data-test-subj="sloOverviewFlyoutPagination"
            />
          </>
        )}
      </EuiFlyoutBody>
      {selectedSloId && sloPlugin?.getSLODetailsFlyout && (
        <sloPlugin.getSLODetailsFlyout
          sloId={selectedSloId}
          onClose={handleCloseSloDetails}
          size="m"
          hideFooter
          session="inherit"
          initialTabId={selectedSloTabId}
        />
      )}
    </EuiFlyout>
  );
}
