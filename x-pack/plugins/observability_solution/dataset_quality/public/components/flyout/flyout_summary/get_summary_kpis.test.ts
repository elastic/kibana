/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatNumber } from '@elastic/eui';
import type { useKibanaContextForPlugin } from '../../../utils';
import { TimeRangeConfig } from '../../../state_machines/dataset_quality_controller';

import {
  BYTE_NUMBER_FORMAT,
  DEFAULT_DATEPICKER_REFRESH,
  DEFAULT_TIME_RANGE,
  MAX_HOSTS_METRIC_VALUE,
} from '../../../../common/constants';
import {
  flyoutDegradedDocsText,
  flyoutDocsCountTotalText,
  flyoutHostsText,
  flyoutServicesText,
  flyoutShowAllText,
  flyoutSizeText,
} from '../../../../common/translations';
import { getSummaryKpis } from './get_summary_kpis';

const dataStreamDetails = {
  services: {
    service1: ['service1Instance1', 'service1Instance2'],
    service2: ['service2Instance1'],
  },
  docsCount: 1000,
  sizeBytes: 5000,
  hosts: {
    host1: ['host1Instance1', 'host1Instance2'],
    host2: ['host2Instance1'],
  },
  degradedDocsCount: 200,
};

const timeRange: TimeRangeConfig = {
  ...DEFAULT_TIME_RANGE,
  refresh: DEFAULT_DATEPICKER_REFRESH,
  from: 'now-15m',
  to: 'now',
};

const degradedDocsHref = 'http://exploratory-view/degraded-docs';
const hostsRedirectUrl = 'http://hosts/metric/';

const hostsLocator = {
  getRedirectUrl: () => hostsRedirectUrl,
} as unknown as ReturnType<
  typeof useKibanaContextForPlugin
>['services']['observabilityShared']['locators']['infra']['hostsLocator'];

describe('getSummaryKpis', () => {
  it('should return the correct KPIs', () => {
    const result = getSummaryKpis({
      dataStreamDetails,
      timeRange,
      degradedDocsHref,
      hostsLocator,
    });

    expect(result).toEqual([
      {
        title: flyoutDocsCountTotalText,
        value: '1,000',
        userHasPrivilege: true,
      },
      {
        title: flyoutSizeText,
        value: formatNumber(dataStreamDetails.sizeBytes ?? 0, BYTE_NUMBER_FORMAT),
        userHasPrivilege: true,
      },
      {
        title: flyoutServicesText,
        value: '3',
        link: undefined,
        userHasPrivilege: true,
      },
      {
        title: flyoutHostsText,
        value: '3',
        link: undefined,
        userHasPrivilege: true,
      },
      {
        title: flyoutDegradedDocsText,
        value: '200',
        link: {
          label: flyoutShowAllText,
          href: degradedDocsHref,
        },
        userHasPrivilege: true,
      },
    ]);
  });

  it('show X+ if number of hosts or services exceed MAX_HOSTS_METRIC_VALUE', () => {
    const services = {
      service1: new Array(MAX_HOSTS_METRIC_VALUE + 1)
        .fill('service1Instance')
        .map((_, i) => `service1Instance${i}`),
    };

    const host3 = new Array(MAX_HOSTS_METRIC_VALUE + 1)
      .fill('host3Instance')
      .map((_, i) => `host3Instance${i}`);

    const detailsWithMaxPlusHosts = {
      ...dataStreamDetails,
      services,
      hosts: { ...dataStreamDetails.hosts, host3 },
    };

    const result = getSummaryKpis({
      dataStreamDetails: detailsWithMaxPlusHosts,
      timeRange,
      degradedDocsHref,
      hostsLocator,
    });

    expect(result).toEqual([
      {
        title: flyoutDocsCountTotalText,
        value: '1,000',
        userHasPrivilege: true,
      },
      {
        title: flyoutSizeText,
        value: formatNumber(dataStreamDetails.sizeBytes ?? 0, BYTE_NUMBER_FORMAT),
        userHasPrivilege: true,
      },
      {
        title: flyoutServicesText,
        value: '50+',
        link: undefined,
        userHasPrivilege: true,
      },
      {
        title: flyoutHostsText,
        value: '54+',
        link: undefined,
        userHasPrivilege: true,
      },
      {
        title: flyoutDegradedDocsText,
        value: '200',
        link: {
          label: flyoutShowAllText,
          href: degradedDocsHref,
        },
        userHasPrivilege: true,
      },
    ]);
  });
});
