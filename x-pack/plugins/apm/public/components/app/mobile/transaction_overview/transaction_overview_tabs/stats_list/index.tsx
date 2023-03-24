/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { ManagedTable } from '../../../../../shared/managed_table';
import { APIReturnType } from '../../../../../../services/rest/create_call_apm_api';
import { getColumns } from './get_columns';
import { isIosAgentName } from '../../../../../../../common/agent_name';

type MobileMainStatisticsByField =
  APIReturnType<'GET /internal/apm/mobile-services/{serviceName}/main_statistics'>['mainStatistics'];

type MobileDetailedStatisticsByField =
  APIReturnType<'GET /internal/apm/mobile-services/{serviceName}/detailed_statistics'>;

interface Props {
  agentName?: string;
  isLoading: boolean;
  mainStatistics: MobileMainStatisticsByField;
  detailedStatisticsLoading: boolean;
  detailedStatistics: MobileDetailedStatisticsByField;
  comparisonEnabled?: boolean;
  offset?: string;
}
export function StatsList({
  agentName,
  isLoading,
  mainStatistics,
  detailedStatisticsLoading,
  detailedStatistics,
  comparisonEnabled,
  offset,
}: Props) {
  const columns = useMemo(() => {
    return getColumns({
      agentName,
      showAppLaunchTimeColumn: !isIosAgentName(agentName),
      detailedStatisticsLoading,
      detailedStatistics,
      comparisonEnabled,
      offset,
    });
  }, [
    agentName,
    detailedStatisticsLoading,
    detailedStatistics,
    comparisonEnabled,
    offset,
  ]);
  return (
    <ManagedTable
      noItemsMessage={
        isLoading
          ? i18n.translate('xpack.apm.statsTable.loading', {
              defaultMessage: 'Loading...',
            })
          : i18n.translate('xpack.apm.statsTable.noDataLabel', {
              defaultMessage: 'No data found',
            })
      }
      items={mainStatistics}
      columns={columns}
      sortItems={false}
      initialPageSize={25}
      isLoading={isLoading}
    />
  );
}
