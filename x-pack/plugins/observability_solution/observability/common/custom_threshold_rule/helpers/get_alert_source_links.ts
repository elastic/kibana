/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '@kbn/observability-shared-plugin/common';
import { LocatorPublic } from '@kbn/share-plugin/common';
import { SerializableRecord } from '@kbn/utility-types';
import { getApmAppLocator } from '../get_apm_app_url';
import { Group, TimeRange } from '../types';

const HOST_NAME = 'host.name';
const CONTAINER_ID = 'container.id';
const KUBERNETES_POD_ID = 'kubernetes.pod.id';
const AWS_EC2_INSTANCE = 'cloud.instance.id';
const AWS_S3_BUCKET = 'aws.s3.instance.id';
const AWS_RDS_DATABASES = 'aws.rds.instance.id';
const AWS_SQS_QUEUE = 'aws.sqs.instance.id';

const METRICS_DETAILS_PATH = '/app/metrics/detail';

export const infraSources = [
  HOST_NAME,
  CONTAINER_ID,
  KUBERNETES_POD_ID,
  AWS_EC2_INSTANCE,
  AWS_S3_BUCKET,
  AWS_RDS_DATABASES,
  AWS_SQS_QUEUE,
];

export const apmSources = [SERVICE_NAME, SERVICE_ENVIRONMENT, TRANSACTION_TYPE, TRANSACTION_NAME];

const infraSourceLinks: Record<string, string> = {
  [HOST_NAME]: `${METRICS_DETAILS_PATH}/host`,
  [CONTAINER_ID]: `${METRICS_DETAILS_PATH}/container`,
  [KUBERNETES_POD_ID]: `${METRICS_DETAILS_PATH}/pod`,
  [AWS_EC2_INSTANCE]: `${METRICS_DETAILS_PATH}/awsEC2`,
  [AWS_S3_BUCKET]: `${METRICS_DETAILS_PATH}/awsS3`,
  [AWS_RDS_DATABASES]: `${METRICS_DETAILS_PATH}/awsRDS`,
  [AWS_SQS_QUEUE]: `${METRICS_DETAILS_PATH}/awsSQS`,
};

const generateInfraSourceLink = (
  { field, value }: Group,
  hostTimeRange: string,
  infraTimeRange: string
) => {
  const link =
    field === HOST_NAME
      ? `${infraSourceLinks[field]}/${value}?${hostTimeRange}`
      : `${infraSourceLinks[field]}/${value}?${infraTimeRange}`;

  return link;
};

const generateApmSourceLink = (
  { field, value }: Group,
  timeRange: TimeRange,
  serviceName?: string,
  baseLocator?: LocatorPublic<SerializableRecord>
) => {
  if (!serviceName) {
    return undefined;
  }

  let apmLocatorPayload: SerializableRecord = {
    serviceName,
    environment: 'ENVIRONMENT_ALL',
    rangeFrom: timeRange.from,
    rangeTo: timeRange.to,
  };

  if (field === TRANSACTION_NAME) {
    apmLocatorPayload = {
      ...apmLocatorPayload,
      serviceOverviewTab: 'transactions',
      transactionName: value,
    };
  } else if (field === TRANSACTION_TYPE) {
    apmLocatorPayload = {
      ...apmLocatorPayload,
      transactionType: value,
    };
  } else if (field === SERVICE_ENVIRONMENT) {
    apmLocatorPayload = {
      ...apmLocatorPayload,
      environment: value,
    };
  }

  const apmAppLocator = getApmAppLocator(baseLocator);
  return apmAppLocator?.getRedirectUrl(apmLocatorPayload);
};

export const generateSourceLink = (
  { field, value }: Group,
  timeRange: TimeRange,
  prepend?: (url: string) => string,
  serviceName?: string,
  baseLocator?: LocatorPublic<SerializableRecord>
) => {
  if (infraSources.includes(field)) {
    const hostTimeRange = `assetDetails=(dateRange:(from:'${timeRange.from}',to:'${timeRange.to}'))`;
    const infraTimeRange = `_a=(time:(from:'${timeRange.from}',to:'${timeRange.to}',interval:>=1m))`;
    return prepend?.(generateInfraSourceLink({ field, value }, hostTimeRange, infraTimeRange));
  } else if (apmSources.includes(field)) {
    return generateApmSourceLink({ field, value }, timeRange, serviceName, baseLocator);
  }
};
