/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { TabContentProps } from '.';
import { isPending } from '../../../../../hooks/use_fetcher';
import { StatsList } from './stats_list';
import { useMobileStatisticsFetcher } from './use_mobile_statistics_fetcher';
import { DEVICE_MODEL_IDENTIFIER } from '../../../../../../common/es_fields/apm';

function DevicesTab({
  environment,
  kuery,
  start,
  end,
  comparisonEnabled,
  offset,
}: TabContentProps) {
  const { mainStatistics, mainStatisticsStatus, detailedStatistics, detailedStatisticsStatus } =
    useMobileStatisticsFetcher({
      field: DEVICE_MODEL_IDENTIFIER,
      environment,
      kuery,
      start,
      end,
      comparisonEnabled,
      offset,
    });

  return (
    <StatsList
      isLoading={isPending(mainStatisticsStatus)}
      mainStatistics={mainStatistics}
      detailedStatisticsLoading={isPending(detailedStatisticsStatus)}
      detailedStatistics={detailedStatistics}
      comparisonEnabled={comparisonEnabled}
      offset={offset}
    />
  );
}

export const devicesTab = {
  dataTestSubj: 'apmDevicesTab',
  key: 'devices_tab',
  label: i18n.translate('xpack.apm.mobile.transactions.overview.tabs.devices', {
    defaultMessage: 'Devices',
  }),
  component: DevicesTab,
};
