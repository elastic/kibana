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
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getSurveyFeedbackURL } from '@kbn/observability-shared-plugin/public';
import React, { useContext, useMemo } from 'react';
import {
  ServiceInventoryFieldName,
  ServiceListItem,
} from '../../../../../common/service_inventory';
import { isDefaultTransactionType } from '../../../../../common/transaction_types';
import { KibanaEnvironmentContext } from '../../../../context/kibana_environment_context/kibana_environment_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useBreakpoints } from '../../../../hooks/use_breakpoints';
import { useFallbackToTransactionsFetcher } from '../../../../hooks/use_fallback_to_transactions_fetcher';
import { FETCH_STATUS, isFailure, isPending } from '../../../../hooks/use_fetcher';
import { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { AggregatedTransactionsBadge } from '../../../shared/aggregated_transactions_badge';
import {
  ITableColumn,
  ManagedTable,
  SortFunction,
  TableSearchBar,
} from '../../../shared/managed_table';
import { TryItButton } from '../../../shared/try_it_button';
import { getServiceColumns } from './get_service_columns';
import { InteractiveServiceListItem } from './types';

type ServicesDetailedStatisticsAPIResponse =
  APIReturnType<'POST /internal/apm/services/detailed_statistics'>;

interface Props {
  status: FETCH_STATUS;
  items: InteractiveServiceListItem[];
  comparisonDataLoading: boolean;
  comparisonData?: ServicesDetailedStatisticsAPIResponse;
  noItemsMessage?: React.ReactNode;
  displayHealthStatus: boolean;
  displayAlerts: boolean;
  initialSortField: ServiceInventoryFieldName;
  initialPageSize: number;
  initialSortDirection: 'asc' | 'desc';
  sortFn: SortFunction<InteractiveServiceListItem>;
  maxCountExceeded: boolean;
  onChangeSearchQuery: (searchQuery: string) => void;
  onChangeRenderedItems: (renderedItems: InteractiveServiceListItem[]) => void;
  isTableSearchBarEnabled: boolean;
  isSavingSetting: boolean;
  onChangeTableSearchBarVisibility: () => void;
}

export function ServiceList({
  status,
  items,
  noItemsMessage,
  comparisonDataLoading,
  comparisonData,
  displayHealthStatus,
  displayAlerts,
  initialSortField,
  initialSortDirection,
  initialPageSize,
  sortFn,
  maxCountExceeded,
  onChangeSearchQuery,
  onChangeRenderedItems,
  isTableSearchBarEnabled,
  isSavingSetting,
  onChangeTableSearchBarVisibility,
}: Props) {
  const { kibanaVersion, isCloudEnv, isServerlessEnv } = useContext(KibanaEnvironmentContext);
  const breakpoints = useBreakpoints();
  const showTransactionTypeColumn = items.some(
    ({ transactionType }) => transactionType && !isDefaultTransactionType(transactionType)
  );

  const { query } = useApmParams('/services');
  const { kuery } = query;
  const { fallbackToTransactions } = useFallbackToTransactionsFetcher({
    kuery,
  });

  const serviceColumns = useMemo(() => {
    return getServiceColumns({
      showTransactionTypeColumn,
      comparisonDataLoading,
      comparisonData,
      breakpoints,
      showHealthStatusColumn: displayHealthStatus,
      showAlertsColumn: displayAlerts,
    });
  }, [
    showTransactionTypeColumn,
    comparisonDataLoading,
    comparisonData,
    breakpoints,
    displayHealthStatus,
    displayAlerts,
  ]);

  const tableSearchBar: TableSearchBar<ServiceListItem> = useMemo(() => {
    return {
      isEnabled: isTableSearchBarEnabled,
      fieldsToSearch: ['serviceName'],
      maxCountExceeded,
      onChangeSearchQuery,
      placeholder: i18n.translate('xpack.apm.servicesTable.filterServicesPlaceholder', {
        defaultMessage: 'Search services by name',
      }),
    };
  }, [isTableSearchBarEnabled, maxCountExceeded, onChangeSearchQuery]);

  return (
    <EuiFlexGroup gutterSize="xs" direction="column" responsive={false}>
      <EuiFlexItem>
        <TryItButton
          isFeatureEnabled={isTableSearchBarEnabled}
          linkLabel={
            isTableSearchBarEnabled
              ? i18n.translate('xpack.apm.serviceList.disableFastFilter', {
                  defaultMessage: 'Disable fast filter',
                })
              : i18n.translate('xpack.apm.serviceList.enableFastFilter', {
                  defaultMessage: 'Enable fast filter',
                })
          }
          onClick={onChangeTableSearchBarVisibility}
          isLoading={isSavingSetting}
          popoverContent={
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFlexItem grow={false}>
                {i18n.translate('xpack.apm.serviceList.turnOffFastFilter', {
                  defaultMessage:
                    'Fast filtering allows you to instantly search for your services using free text.',
                })}
              </EuiFlexItem>
              {isTableSearchBarEnabled && (
                <EuiFlexItem grow={false}>
                  <EuiLink
                    data-test-subj="apmServiceListGiveFeedbackLink"
                    href={getSurveyFeedbackURL({
                      formUrl: 'https://ela.st/service-inventory-fast-filter-feedback',
                      kibanaVersion,
                      isCloudEnv,
                      isServerlessEnv,
                    })}
                    target="_blank"
                  >
                    {i18n.translate('xpack.apm.serviceList.giveFeedbackFlexItemLabel', {
                      defaultMessage: 'Give feedback',
                    })}
                  </EuiLink>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          }
        />
        <EuiSpacer size="s" />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup alignItems="center" gutterSize="xs" justifyContent="flexEnd">
          {fallbackToTransactions && (
            <EuiFlexItem>
              <AggregatedTransactionsBadge />
            </EuiFlexItem>
          )}
          {maxCountExceeded && (
            <EuiFlexItem grow={false}>
              <EuiToolTip
                position="top"
                content={i18n.translate('xpack.apm.servicesTable.tooltip.maxCountExceededWarning', {
                  defaultMessage:
                    'The limit of 1,000 services is exceeded. Please use the query bar to narrow down the results or create service groups.',
                })}
              >
                <EuiIcon type="warning" color="danger" />
              </EuiToolTip>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiIconTip
              position="top"
              type="questionInCircle"
              color="subdued"
              content={i18n.translate('xpack.apm.servicesTable.tooltip.metricsExplanation', {
                defaultMessage:
                  'Service metrics are aggregated on their transaction type, which can be request or page-load. If neither exists, metrics are aggregated on the top available transaction type.',
              })}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.apm.servicesTable.metricsExplanationLabel', {
                defaultMessage: 'What are these metrics?',
              })}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <ManagedTable<InteractiveServiceListItem>
          isLoading={isPending(status)}
          error={isFailure(status)}
          columns={serviceColumns as Array<ITableColumn<InteractiveServiceListItem>>}
          items={items}
          noItemsMessage={noItemsMessage}
          initialSortField={initialSortField}
          initialSortDirection={initialSortDirection}
          initialPageSize={initialPageSize}
          sortFn={sortFn}
          onChangeRenderedItems={onChangeRenderedItems}
          tableSearchBar={tableSearchBar}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
