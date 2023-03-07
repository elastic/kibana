/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiFlexGroup,
} from '@elastic/eui';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { TransactionsTable } from '../../../shared/transactions_table';
import { replace } from '../../../shared/links/url_helpers';
import { getKueryWithMobileFilters } from '../../../../../common/utils/get_kuery_with_mobile_filters';
import { MobileTransactionCharts } from './transaction_charts';
import { MobileLocationStats } from '../service_overview/stats/location_stats';
import { useFiltersForEmbeddableCharts } from '../../../../hooks/use_filters_for_embeddable_charts';
import { GeoMap } from '../service_overview/geo_map';

export function MobileTransactionOverview() {
  const {
    path: { serviceName },
    query: {
      environment,
      rangeFrom,
      rangeTo,
      transactionType: transactionTypeFromUrl,
      device,
      osVersion,
      appVersion,
      netConnectionType,
      kuery,
      offset,
      comparisonEnabled,
    },
  } = useApmParams('/mobile-services/{serviceName}/transactions');

  const embeddableFilters = useFiltersForEmbeddableCharts({
    serviceName,
    environment,
  });

  const kueryWithMobileFilters = getKueryWithMobileFilters({
    device,
    osVersion,
    appVersion,
    netConnectionType,
    kuery,
  });

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { transactionType } = useApmServiceContext();

  const history = useHistory();

  // redirect to first transaction type
  if (!transactionTypeFromUrl && transactionType) {
    replace(history, { query: { transactionType } });
  }

  return (
    <>
      <EuiFlexItem>
        <EuiHorizontalRule />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup>
          <EuiFlexItem grow={8}>
            <EuiPanel hasBorder={true}>
              <GeoMap
                start={start}
                end={end}
                kuery={kueryWithMobileFilters}
                filters={embeddableFilters}
              />
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem grow={4}>
            <MobileLocationStats
              start={start}
              end={end}
              kuery={kueryWithMobileFilters}
              environment={environment}
              serviceName={serviceName}
              offset={offset}
              comparisonEnabled={comparisonEnabled}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiSpacer size="s" />
      <MobileTransactionCharts
        transactionType={transactionType}
        serviceName={serviceName}
        kuery={kueryWithMobileFilters}
        environment={environment}
        start={start}
        end={end}
        offset={offset}
        comparisonEnabled={comparisonEnabled}
      />
      <EuiSpacer size="s" />
      <EuiPanel hasBorder={true}>
        <TransactionsTable
          hideViewTransactionsLink
          numberOfTransactionsPerPage={25}
          showMaxTransactionGroupsExceededWarning
          environment={environment}
          kuery={kueryWithMobileFilters}
          start={start}
          end={end}
          saveTableOptionsToUrl
        />
      </EuiPanel>
    </>
  );
}
