/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getRelatedAlertKuery,
  SERVICE_NAME,
  MONITOR_ID,
  OBSERVER_NAME,
  HOST,
  KUBERNETES_POD,
  DOCKER_CONTAINER,
  EC2_INSTANCE,
  S3_BUCKETS,
  RDS_DATABASES,
  SQS_QUEUES,
} from './get_related_alerts_query';
import { fromKueryExpression } from '@kbn/es-query';

describe('getRelatedAlertKuery', () => {
  const tags = ['tag1:v', 'tag2', 'apm'];
  const groups = [
    { field: 'group1Field', value: 'group1Value' },
    { field: 'group2Field', value: 'group2:Value' },
  ];
  const ruleId = 'ruleUuid';
  const sharedFields = [
    { name: SERVICE_NAME, value: `my-${SERVICE_NAME}` },
    { name: MONITOR_ID, value: `my-${MONITOR_ID}` },
    { name: OBSERVER_NAME, value: `my-${OBSERVER_NAME}` },
    { name: HOST, value: `my-${HOST}` },
    { name: KUBERNETES_POD, value: `my-${KUBERNETES_POD}` },
    { name: DOCKER_CONTAINER, value: `my-${DOCKER_CONTAINER}` },
    { name: EC2_INSTANCE, value: `my-${EC2_INSTANCE}` },
    { name: S3_BUCKETS, value: `my-${S3_BUCKETS}` },
    { name: RDS_DATABASES, value: `my-${RDS_DATABASES}` },
    { name: SQS_QUEUES, value: `my-${SQS_QUEUES}` },
  ];
  const tagsKuery = '(tags: "tag1:v" or tags: "tag2")';
  const groupsKuery =
    '(group1Field: "group1Value" or kibana.alert.group.value: "group1Value") or (group2Field: "group2:Value" or kibana.alert.group.value: "group2:Value")';
  const ruleKuery = '(kibana.alert.rule.uuid: "ruleUuid")';
  const sharedFieldsKuery =
    `(service.name: "my-service.name") or (monitor.id: "my-monitor.id") or (observer.name: "my-observer.name")` +
    ` or (host.name: "my-host.name") or (kubernetes.pod.uid: "my-kubernetes.pod.uid") or (container.id: "my-container.id")` +
    ` or (cloud.instance.id: "my-cloud.instance.id") or (aws.s3.bucket.name: "my-aws.s3.bucket.name")` +
    ` or (aws.rds.db_instance.arn: "my-aws.rds.db_instance.arn") or (aws.sqs.queue.name: "my-aws.sqs.queue.name")`;

  it('should generate correct query with no tags or groups', () => {
    expect(getRelatedAlertKuery()).toBeUndefined();
  });

  it('should generate correct query for tags', () => {
    const kuery = getRelatedAlertKuery({ tags });
    expect(kuery).toEqual(tagsKuery);

    // Should be able to parse keury without throwing error
    fromKueryExpression(kuery!);
  });

  it('should generate correct query for groups', () => {
    const kuery = getRelatedAlertKuery({ groups });
    expect(kuery).toEqual(groupsKuery);

    // Should be able to parse keury without throwing error
    fromKueryExpression(kuery!);
  });

  it('should generate correct query for tags and groups', () => {
    const kuery = getRelatedAlertKuery({ tags, groups });
    expect(kuery).toEqual(`${tagsKuery} or ${groupsKuery}`);

    // Should be able to parse keury without throwing error
    fromKueryExpression(kuery!);
  });

  it('should generate correct query for tags, groups and ruleId', () => {
    const kuery = getRelatedAlertKuery({ tags, groups, ruleId });
    expect(kuery).toEqual(`${tagsKuery} or ${groupsKuery} or ${ruleKuery}`);

    // Should be able to parse keury without throwing error
    fromKueryExpression(kuery!);
  });

  it('should generate correct query for sharedFields', () => {
    const kuery = getRelatedAlertKuery({ sharedFields });
    expect(kuery).toEqual(sharedFieldsKuery);

    // Should be able to parse keury without throwing error
    fromKueryExpression(kuery!);
  });

  it('should generate correct query when all the fields are provided', () => {
    const kuery = getRelatedAlertKuery({ tags, groups, ruleId, sharedFields });
    expect(kuery).toEqual(`${tagsKuery} or ${groupsKuery} or ${sharedFieldsKuery} or ${ruleKuery}`);

    // Should be able to parse keury without throwing error
    fromKueryExpression(kuery!);
  });

  it('should not include service.name twice', () => {
    const serviceNameGroups = [{ field: 'service.name', value: 'myServiceName' }];
    const serviceNameSharedFields = [{ name: SERVICE_NAME, value: `my-${SERVICE_NAME}` }];
    const kuery = getRelatedAlertKuery({
      groups: serviceNameGroups,
      sharedFields: serviceNameSharedFields,
    });
    expect(kuery).toEqual(
      `(service.name: "myServiceName" or kibana.alert.group.value: "myServiceName")`
    );

    // Should be able to parse keury without throwing error
    fromKueryExpression(kuery!);
  });
});
