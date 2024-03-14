/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENVIRONMENT_ALL } from '@kbn/exploratory-view-plugin/public';
import { SerializableRecord } from '@kbn/utility-types';
import React, { useMemo } from 'react';
import { useKibana } from '../../../../utils/kibana_react';
import { TimeRange } from '../../types';

const HOST_NAME = 'host.name';
const CONTAINER_ID = 'container.id';
const KUBERNETES_POD_ID = 'kubernetes.pod.id';
const AWS_EC2_INSTANCE = 'cloud.instance.id';
const AWS_S3_BUCKET = 'aws.s3.instance.id';
const AWS_RDS_DATABASES = 'aws.rds.instance.id';
const AWS_SQS_QUEUE = 'aws.sqs.instance.id';
const SERVICE_NAME = 'service.name';
const SERVICE_ENVIRONMENT = 'service.environment';
const TRANSACTION_TYPE = 'transaction.type';
const TRANSACTION_NAME = 'transaction.name';

const METRICS_DETAILS_PATH = '/app/metrics/detail';

const infraSources = [
  HOST_NAME,
  CONTAINER_ID,
  KUBERNETES_POD_ID,
  AWS_EC2_INSTANCE,
  AWS_S3_BUCKET,
  AWS_RDS_DATABASES,
  AWS_SQS_QUEUE,
];

const apmSources = [SERVICE_NAME, SERVICE_ENVIRONMENT, TRANSACTION_TYPE, TRANSACTION_NAME];

const APM_APP_LOCATOR_ID = 'APM_LOCATOR';

const getApmLocatorParams = (params: SerializableRecord) => {
  return {
    serviceName: params.serviceName,
    serviceOverviewTab: params.serviceOverviewTab,
    query: {
      environment: params.environment,
      transactionType: params.transactionType,
      transactionName: params.transactionName,
      rangeFrom: params.rangeFrom,
      rangeTo: params.rangeTo,
    },
  };
};

interface GroupItem {
  field: string;
  value: string;
}

export function Groups({ groups, timeRange }: { groups: GroupItem[]; timeRange: TimeRange }) {
  const {
    http: {
      basePath: { prepend },
    },
    share: {
      url: { locators },
    },
  } = useKibana().services;

  const apmLocator = useMemo(() => {
    const baseLocator = locators.get(APM_APP_LOCATOR_ID);
    if (!baseLocator) return;

    return {
      ...baseLocator,
      getRedirectUrl: (params: SerializableRecord) =>
        baseLocator.getRedirectUrl(getApmLocatorParams(params)),
      navigate: (params: SerializableRecord) => baseLocator.navigate(getApmLocatorParams(params)),
    };
  }, [locators]);

  const infraSourceLinks: Record<string, string> = {
    [HOST_NAME]: prepend(`${METRICS_DETAILS_PATH}/host`),
    [CONTAINER_ID]: prepend(`${METRICS_DETAILS_PATH}/container`),
    [KUBERNETES_POD_ID]: prepend(`${METRICS_DETAILS_PATH}/pod`),
    [AWS_EC2_INSTANCE]: prepend(`${METRICS_DETAILS_PATH}/awsEC2`),
    [AWS_S3_BUCKET]: prepend(`${METRICS_DETAILS_PATH}/awsS3`),
    [AWS_RDS_DATABASES]: prepend(`${METRICS_DETAILS_PATH}/awsRDS`),
    [AWS_SQS_QUEUE]: prepend(`${METRICS_DETAILS_PATH}/awsSQS`),
  };

  const hostTimeRange = `assetDetails=(dateRange:(from:'${timeRange.from}',to:'${timeRange.to}'))`;
  const infraTimeRange = `_a=(time:(from:'${timeRange.from}',to:'${timeRange.to}',interval:>=1m))`;

  const generateInfraSourceLink = ({ field, value }: GroupItem) => {
    const link =
      field === HOST_NAME
        ? `${infraSourceLinks[field]}/${value}?${hostTimeRange}`
        : `${infraSourceLinks[field]}/${value}?${infraTimeRange}`;

    return (
      <a href={link} target="_blank">
        {value}
      </a>
    );
  };

  const generateApmSourceLink = ({ field, value }: GroupItem) => {
    const serviceName = groups.find((group) => group.field === SERVICE_NAME)?.value;

    let apmLocatorPayload: SerializableRecord = {
      serviceName,
      environment: ENVIRONMENT_ALL,
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

    return (
      <a href={apmLocator?.getRedirectUrl(apmLocatorPayload)} target="_blank">
        {value}
      </a>
    );
  };

  const generateNoSourceLink = ({ value }: GroupItem) => {
    return <strong>{value}</strong>;
  };

  const generateSourceLink = ({ field, value }: GroupItem) => {
    return infraSources.includes(field)
      ? generateInfraSourceLink({ field, value })
      : apmSources.includes(field)
      ? generateApmSourceLink({ field, value })
      : generateNoSourceLink({ field, value });
  };

  return (
    <>
      {groups &&
        groups.map((group) => {
          return (
            <span key={group.field}>
              {group.field}: {generateSourceLink(group)}
              <br />
            </span>
          );
        })}
    </>
  );
}
