/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatNumber } from '@elastic/eui';

import { BYTE_NUMBER_FORMAT, MAX_HOSTS_METRIC_VALUE } from '../../../../common/constants';
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

const timeRange = {
  from: 'now-15m',
  to: 'now',
  refresh: false,
};

const degradedDocsHref = 'http://exploratory-view/degraded-docs';
const hostsRedirectUrl = 'http://hosts/metric/';

const hostsLocator = {
  getRedirectUrl: () => hostsRedirectUrl,
};

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
      },
      {
        title: flyoutSizeText,
        value: formatNumber(dataStreamDetails.sizeBytes ?? 0, BYTE_NUMBER_FORMAT),
      },
      {
        title: flyoutServicesText,
        value: '3',
        link: undefined,
      },
      {
        title: flyoutHostsText,
        value: '3',
        link: {
          label: flyoutShowAllText,
          href: hostsRedirectUrl,
        },
      },
      {
        title: flyoutDegradedDocsText,
        value: '200',
        link: {
          label: flyoutShowAllText,
          href: degradedDocsHref,
        },
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
      },
      {
        title: flyoutSizeText,
        value: formatNumber(dataStreamDetails.sizeBytes ?? 0, BYTE_NUMBER_FORMAT),
      },
      {
        title: flyoutServicesText,
        value: '50+',
        link: undefined,
      },
      {
        title: flyoutHostsText,
        value: '54+',
        link: {
          label: flyoutShowAllText,
          href: hostsRedirectUrl,
        },
      },
      {
        title: flyoutDegradedDocsText,
        value: '200',
        link: {
          label: flyoutShowAllText,
          href: degradedDocsHref,
        },
      },
    ]);
  });
});
