/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LocatorPublic } from '@kbn/share-plugin/common';
import { SerializableRecord } from '@kbn/utility-types';
import { generateSourceLink } from './get_alert_source_links';

describe('getAlertSourceLinks', () => {
  const apmLocator = {
    getRedirectUrl: jest.fn(),
  } as unknown as LocatorPublic<SerializableRecord>;

  const prepend = (url: string) => `kibana${url}`;

  const timeRange = {
    from: '2023-12-07T16:00:15.403Z',
    to: '2023-12-07T21:00:15.403Z',
  };

  const serviceName = 'test-service';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Should generate correct link for host.name', () => {
    const link = generateSourceLink({ field: 'host.name', value: 'host-0' }, timeRange, prepend);
    expect(link).toBe(
      `kibana/app/metrics/detail/host/host-0?assetDetails=(dateRange:(from:'2023-12-07T16:00:15.403Z',to:'2023-12-07T21:00:15.403Z'))`
    );
  });

  it('Should generate correct link for container.id', () => {
    const link = generateSourceLink(
      { field: 'container.id', value: 'container-0' },
      timeRange,
      prepend
    );
    expect(link).toBe(
      `kibana/app/metrics/detail/container/container-0?_a=(time:(from:'2023-12-07T16:00:15.403Z',to:'2023-12-07T21:00:15.403Z',interval:>=1m))`
    );
  });

  it('Should generate correct link for kubernetes.pod.id', () => {
    const link = generateSourceLink(
      { field: 'kubernetes.pod.id', value: 'pod-0' },
      timeRange,
      prepend
    );
    expect(link).toBe(
      `kibana/app/metrics/detail/pod/pod-0?_a=(time:(from:'2023-12-07T16:00:15.403Z',to:'2023-12-07T21:00:15.403Z',interval:>=1m))`
    );
  });

  it('Should generate correct link for cloud.instance.id', () => {
    const link = generateSourceLink(
      { field: 'cloud.instance.id', value: 'cloud-instance-0' },
      timeRange,
      prepend
    );
    expect(link).toBe(
      `kibana/app/metrics/detail/awsEC2/cloud-instance-0?_a=(time:(from:'2023-12-07T16:00:15.403Z',to:'2023-12-07T21:00:15.403Z',interval:>=1m))`
    );
  });

  it('Should generate correct link for aws.s3.instance.id', () => {
    const link = generateSourceLink(
      { field: 'aws.s3.instance.id', value: 'aws-s3-instance-0' },
      timeRange,
      prepend
    );
    expect(link).toBe(
      `kibana/app/metrics/detail/awsS3/aws-s3-instance-0?_a=(time:(from:'2023-12-07T16:00:15.403Z',to:'2023-12-07T21:00:15.403Z',interval:>=1m))`
    );
  });

  it('Should generate correct link for aws.rds.instance.id', () => {
    const link = generateSourceLink(
      { field: 'aws.rds.instance.id', value: 'aws-rds-instance-0' },
      timeRange,
      prepend
    );
    expect(link).toBe(
      `kibana/app/metrics/detail/awsRDS/aws-rds-instance-0?_a=(time:(from:'2023-12-07T16:00:15.403Z',to:'2023-12-07T21:00:15.403Z',interval:>=1m))`
    );
  });

  it('Should generate correct link for aws.sqs.instance.id', () => {
    const link = generateSourceLink(
      { field: 'aws.sqs.instance.id', value: 'aws-sqs-instance-0' },
      timeRange,
      prepend
    );
    expect(link).toBe(
      `kibana/app/metrics/detail/awsSQS/aws-sqs-instance-0?_a=(time:(from:'2023-12-07T16:00:15.403Z',to:'2023-12-07T21:00:15.403Z',interval:>=1m))`
    );
  });

  it('Should generate correct link for service.name', () => {
    generateSourceLink(
      { field: 'service.name', value: 'test-service' },
      timeRange,
      prepend,
      serviceName,
      apmLocator
    );
    expect(apmLocator.getRedirectUrl).toHaveBeenCalledWith({
      query: {
        environment: 'ENVIRONMENT_ALL',
        rangeFrom: '2023-12-07T16:00:15.403Z',
        rangeTo: '2023-12-07T21:00:15.403Z',
        transactionName: undefined,
        transactionType: undefined,
      },
      serviceName: 'test-service',
      serviceOverviewTab: undefined,
    });
  });

  it('Should generate correct link for service.environment', () => {
    generateSourceLink(
      { field: 'service.environment', value: 'test-env' },
      timeRange,
      prepend,
      serviceName,
      apmLocator
    );
    expect(apmLocator.getRedirectUrl).toHaveBeenCalledWith({
      query: {
        environment: 'test-env',
        rangeFrom: '2023-12-07T16:00:15.403Z',
        rangeTo: '2023-12-07T21:00:15.403Z',
        transactionName: undefined,
        transactionType: undefined,
      },
      serviceName: 'test-service',
      serviceOverviewTab: undefined,
    });
  });

  it('Should generate correct link for transaction.type', () => {
    generateSourceLink(
      { field: 'transaction.type', value: 'test-request' },
      timeRange,
      prepend,
      serviceName,
      apmLocator
    );
    expect(apmLocator.getRedirectUrl).toHaveBeenCalledWith({
      query: {
        environment: 'ENVIRONMENT_ALL',
        rangeFrom: '2023-12-07T16:00:15.403Z',
        rangeTo: '2023-12-07T21:00:15.403Z',
        transactionName: undefined,
        transactionType: 'test-request',
      },
      serviceName: 'test-service',
      serviceOverviewTab: undefined,
    });
  });

  it('Should generate correct link for transaction.name', () => {
    generateSourceLink(
      { field: 'transaction.name', value: 'test-transaction' },
      timeRange,
      prepend,
      serviceName,
      apmLocator
    );
    expect(apmLocator.getRedirectUrl).toHaveBeenCalledWith({
      query: {
        environment: 'ENVIRONMENT_ALL',
        rangeFrom: '2023-12-07T16:00:15.403Z',
        rangeTo: '2023-12-07T21:00:15.403Z',
        transactionName: 'test-transaction',
        transactionType: undefined,
      },
      serviceName: 'test-service',
      serviceOverviewTab: 'transactions',
    });
  });
});
