/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
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
const APM_PATH = '/app/apm/services';

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

interface GroupItem {
  field: string;
  value: string;
}

export function Groups({ groups, timeRange }: { groups: GroupItem[]; timeRange: TimeRange }) {
  const {
    http: {
      basePath: { prepend },
    },
  } = useKibana().services;

  const infraSourceLinks: Record<string, string> = {
    [HOST_NAME]: prepend(`${METRICS_DETAILS_PATH}/host`),
    [CONTAINER_ID]: prepend(`${METRICS_DETAILS_PATH}/container`),
    [KUBERNETES_POD_ID]: prepend(`${METRICS_DETAILS_PATH}/pod`),
    [AWS_EC2_INSTANCE]: prepend(`${METRICS_DETAILS_PATH}/awsEC2`),
    [AWS_S3_BUCKET]: prepend(`${METRICS_DETAILS_PATH}/awsS3`),
    [AWS_RDS_DATABASES]: prepend(`${METRICS_DETAILS_PATH}/awsRDS`),
    [AWS_SQS_QUEUE]: prepend(`${METRICS_DETAILS_PATH}/awsSQS`),
  };

  const generateInfraSourceLink = ({ field, value }: GroupItem) => {
    const alertTimeRange = `assetDetails=(dateRange:(from:'${timeRange.from}',to:'${timeRange.to}'))`;

    return (
      <a href={`${infraSourceLinks[field]}/${value}?${alertTimeRange}`} target="_blank">
        {value}
      </a>
    );
  };

  const generateApmSourceLink = ({ field, value }: GroupItem) => {
    const serviceName = groups.find((group) => group.field === SERVICE_NAME)?.value;
    const apmServiceView = `${prepend(APM_PATH)}/${serviceName}`;
    const alertTimeRange = `rangeFrom=${timeRange.from}&rangeTo=${timeRange.to}`;

    const link =
      field === TRANSACTION_NAME
        ? `${apmServiceView}/transactions/view?transactionName=${value}&${alertTimeRange}`
        : field === TRANSACTION_TYPE
        ? `${apmServiceView}?transactionType=${value}&${alertTimeRange}`
        : field === SERVICE_ENVIRONMENT
        ? `${apmServiceView}?environment=${value}&${alertTimeRange}`
        : `${apmServiceView}?${alertTimeRange}`;

    return (
      <a href={link} target="_blank">
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
