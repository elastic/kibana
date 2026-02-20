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
import React, { useCallback, useMemo, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { ALL_VALUE } from '@kbn/slo-schema';
import { AgentIcon } from '@kbn/custom-icons';
import type { SloTabId, SloListLocatorParams } from '@kbn/deeplinks-observability';
import { ALERTS_TAB_ID, sloListLocatorID } from '@kbn/deeplinks-observability';
import type { AgentName } from '@kbn/elastic-agent-utils';
import type { ApmPluginStartDeps } from '../../../plugin';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useFetcher, isPending } from '../../../hooks/use_fetcher';
import { APM_SLO_INDICATOR_TYPES } from '../../../../common/slo_indicator_types';
import { SERVICE_NAME } from '../../../../common/es_fields/apm';

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
const SEARCH_DEBOUNCE_MS = 300;
const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50];

export function SloOverviewFlyout({ serviceName, agentName, onClose }: Props) {
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'sloOverviewFlyout' });
  const { euiTheme } = useEuiTheme();
  const { uiSettings, slo: sloPlugin, share } = useKibana<ApmPluginStartDeps>().services;
  const { link } = useApmRouter();
  const { query } = useApmParams('/services');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  useDebounce(
    () => {
      setDebouncedSearchQuery(searchQuery);
      setPage(0);
    },
    SEARCH_DEBOUNCE_MS,
    [searchQuery]
  );
  const [selectedStatuses, setSelectedStatuses] = useState<SloStatusFilter[]>([]);
  const [isStatusPopoverOpen, setIsStatusPopoverOpen] = useState(false);
  const [selectedSloId, setSelectedSloId] = useState<string | null>(null);
  const [selectedSloTabId, setSelectedSloTabId] = useState<SloTabId | undefined>(undefined);
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const minItemsPerPage = ITEMS_PER_PAGE_OPTIONS[0];
  const percentFormat = uiSettings?.get('format:percent:defaultPattern') ?? '0.00%';
  const { environment } = query;

  const kqlQuery = useMemo(() => {
    const trimmed = debouncedSearchQuery.trim();
    return trimmed || undefined;
  }, [debouncedSearchQuery]);

  const { data, status: fetchStatus } = useFetcher(
    (callApmApi) => {
      return callApmApi('GET /internal/apm/services/{serviceName}/slos', {
        params: {
          path: { serviceName },
          query: {
            environment,
            page,
            perPage,
            ...(selectedStatuses.length > 0 && { statusFilters: JSON.stringify(selectedStatuses) }),
            ...(kqlQuery && { kqlQuery }),
          },
        },
      });
    },
    [serviceName, environment, selectedStatuses, kqlQuery, page, perPage],
    { showToastOnError: false }
  );

  const isLoading = isPending(fetchStatus);

  const sloData = useMemo(() => data?.results ?? [], [data?.results]);
  const totalSlos = data?.total ?? 0;

  const activeAlerts = useMemo(() => {
    const alertsMap = new Map<string, number>();
    if (data?.activeAlerts) {
      Object.entries(data.activeAlerts).forEach(([key, count]) => {
        alertsMap.set(key, count as number);
      });
    }
    return alertsMap;
  }, [data?.activeAlerts]);

  const getActiveAlertsForSlo = useCallback(
    (sloItem: SLOWithSummaryResponse) => {
      const key = `${sloItem.id}|${sloItem.instanceId ?? ALL_VALUE}`;
      return activeAlerts.get(key) ?? 0;
    },
    [activeAlerts]
  );

  const handleActiveAlertsClick = useCallback((sloItem: SLOWithSummaryResponse) => {
    setSelectedSloTabId(undefined);
    setSelectedSloId(null);

    requestAnimationFrame(() => {
      setSelectedSloTabId(ALERTS_TAB_ID);
      setSelectedSloId(sloItem.id);
    });
  }, []);

  const statusCounts = useMemo(() => {
    const backendCounts = data?.statusCounts;
    return {
      VIOLATED: backendCounts?.violated ?? 0,
      DEGRADING: backendCounts?.degrading ?? 0,
      HEALTHY: backendCounts?.healthy ?? 0,
      NO_DATA: backendCounts?.noData ?? 0,
    };
  }, [data?.statusCounts]);

  // Sort SLOs by alerts count (alerts data is fetched separately, so we sort client-side)
  const sortedSlos = useMemo(() => {
    if (!sloData.length) return [];

    return [...sloData].sort((a, b) => {
      const alertsA = activeAlerts.get(`${a.id}|${a.instanceId ?? ALL_VALUE}`) ?? 0;
      const alertsB = activeAlerts.get(`${b.id}|${b.instanceId ?? ALL_VALUE}`) ?? 0;

      if (alertsA !== alertsB) {
        return alertsB - alertsA;
      }

      // Secondary sort by status priority (API already sorts by status, but we maintain consistency)
      const statusPriorityA = STATUS_PRIORITY[a.summary?.status ?? 'HEALTHY'] ?? 0;
      const statusPriorityB = STATUS_PRIORITY[b.summary?.status ?? 'HEALTHY'] ?? 0;

      return statusPriorityB - statusPriorityA;
    });
  }, [sloData, activeAlerts]);

  const sloAppUrl = useMemo(() => {
    const sloListLocator = share?.url.locators.get<SloListLocatorParams>(sloListLocatorID);
    if (!sloListLocator) return undefined;

    return sloListLocator.getRedirectUrl({
      filters: [
        {
          meta: {
            alias: null,
            disabled: false,
            key: SERVICE_NAME,
            negate: false,
            params: { query: serviceName },
            type: 'phrase',
          },
          query: {
            match_phrase: { [SERVICE_NAME]: serviceName },
          },
        },
        {
          meta: {
            alias: null,
            disabled: false,
            key: 'slo.indicator.type',
            negate: false,
            params: [...APM_SLO_INDICATOR_TYPES],
            type: 'phrases',
          },
          query: {
            terms: { 'slo.indicator.type': [...APM_SLO_INDICATOR_TYPES] },
          },
        },
      ],
    });
  }, [share?.url.locators, serviceName]);

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
    setPage(0);
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleSloClick = useCallback((sloId: string) => {
    setSelectedSloId(null);
    setSelectedSloTabId(undefined);

    requestAnimationFrame(() => {
      setSelectedSloId(sloId);
    });
  }, []);

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
          <EuiToolTip position="top" content={name} anchorProps={{ css: { display: 'flex' } }}>
            <EuiLink
              data-test-subj="apmSloNameLink"
              onClick={() => handleSloClick(sloItem.id)}
              css={{
                display: 'flex',
                alignItems: 'center',
                gap: euiTheme.size.s,
                fontWeight: euiTheme.font.weight.regular,
              }}
            >
              <EuiIcon type="expand" color="subdued" aria-hidden={true} />
              {name}
            </EuiLink>
          </EuiToolTip>
        ),
      },
      {
        field: 'summary.sliValue',
        name: i18n.translate('xpack.apm.sloOverviewFlyout.columns.sliValue', {
          defaultMessage: 'SLI Value',
        }),
        width: '90px',
        align: 'center',
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
        align: 'center',
        render: (target: number) => numeral(target).format(percentFormat),
      },
    ],
    [euiTheme, getActiveAlertsForSlo, handleActiveAlertsClick, handleSloClick, percentFormat]
  );

  const activeFiltersCount = selectedStatuses.length;

  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby={flyoutTitleId}
      // we need this hardcoded size as S is too small and M is too large
      size="550px"
      ownFocus={false}
      session="start"
      resizable
    >
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
              onChange={handleSearchChange}
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
          items={sortedSlos}
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

        {totalSlos > minItemsPerPage && (
          <>
            <EuiSpacer size="m" />
            <EuiTablePagination
              pageCount={Math.ceil(totalSlos / perPage)}
              activePage={page}
              onChangePage={handlePageChange}
              itemsPerPage={perPage}
              itemsPerPageOptions={ITEMS_PER_PAGE_OPTIONS}
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
