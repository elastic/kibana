/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from '@xstate/react';
import { formatNumber } from '@elastic/eui';
import { mapPercentageToQuality } from '../../common/utils';
import { BYTE_NUMBER_FORMAT, MAX_HOSTS_METRIC_VALUE, NUMBER_FORMAT } from '../../common/constants';
import { useDatasetQualityDetailsContext } from '../components/dataset_quality_details/context';

export const useOverviewSummaryPanel = () => {
  const { service } = useDatasetQualityDetailsContext();
  const context = useSelector(service, (state) => state.context) ?? {};

  const isSummaryPanelLoading = useSelector(service, (state) =>
    state.matches('initializing.dataStreamDetails.fetching')
  );

  const dataStreamDetails = 'dataStreamDetails' in context ? context.dataStreamDetails : {};

  const services = dataStreamDetails?.services ?? {};
  const serviceKeys = Object.keys(services);
  const totalServicesCount = serviceKeys
    .map((key: string) => services[key].length)
    .reduce((a, b) => a + b, 0);

  const totalDocsCount = formatNumber(dataStreamDetails.docsCount, NUMBER_FORMAT);

  const sizeInBytes = formatNumber(dataStreamDetails.sizeBytes, BYTE_NUMBER_FORMAT);
  const isUserAllowedToSeeSizeInBytes = dataStreamDetails?.userPrivileges?.canMonitor ?? true;

  const hosts = dataStreamDetails?.hosts ?? {};
  const hostKeys = Object.keys(hosts);
  const countOfHosts = hostKeys
    .map((key: string) => hosts[key].length)
    .reduce(
      ({ count, anyHostExceedsMax }, hostCount) => ({
        count: count + hostCount,
        anyHostExceedsMax: anyHostExceedsMax || hostCount > MAX_HOSTS_METRIC_VALUE,
      }),
      { count: 0, anyHostExceedsMax: false }
    );

  const totalHostsCount = formatMetricValueForMax(
    countOfHosts.anyHostExceedsMax ? countOfHosts.count + 1 : countOfHosts.count,
    countOfHosts.count,
    NUMBER_FORMAT
  );

  const totalDegradedDocsCount = formatNumber(
    dataStreamDetails?.degradedDocsCount ?? 0,
    NUMBER_FORMAT
  );

  const degradedPercentage =
    Number(totalDocsCount) > 0
      ? (Number(totalDegradedDocsCount) / Number(totalDocsCount)) * 100
      : 0;

  const quality = mapPercentageToQuality(degradedPercentage);

  return {
    totalDocsCount,
    sizeInBytes,
    isUserAllowedToSeeSizeInBytes,
    totalServicesCount,
    totalHostsCount,
    isSummaryPanelLoading,
    totalDegradedDocsCount,
    quality,
  };
};

/**
 * Formats a metric value to show a '+' sign if it's above a max value e.g. 50+
 */
function formatMetricValueForMax(value: number, max: number, numberFormat: string): string {
  const exceedsMax = value > max;
  const valueToShow = exceedsMax ? max : value;
  return `${formatNumber(valueToShow, numberFormat)}${exceedsMax ? '+' : ''}`;
}
