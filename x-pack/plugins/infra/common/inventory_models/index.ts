/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { POD_FIELD, HOST_FIELD, CONTAINER_FIELD } from '../constants';
import { host } from './host';
import { pod } from './pod';
import { awsEC2 } from './aws_ec2';
import { awsS3 } from './aws_s3';
import { awsRDS } from './aws_rds';
import { awsSQS } from './aws_sqs';
import { container } from './container';
import { InventoryItemType } from './types';
export { metrics } from './metrics';

export const inventoryModels = [host, pod, container, awsEC2, awsS3, awsRDS, awsSQS];

export const findInventoryModel = (type: InventoryItemType) => {
  const model = inventoryModels.find((m) => m.id === type);
  if (!model) {
    throw new Error(
      i18n.translate('xpack.infra.inventoryModels.findInventoryModel.error', {
        defaultMessage: "The inventory model you've attempted to find does not exist",
      })
    );
  }
  return model;
};

const LEGACY_TYPES = ['host', 'pod', 'container'];

export const getFieldByType = (type: InventoryItemType) => {
  switch (type) {
    case 'pod':
      return POD_FIELD;
    case 'host':
      return HOST_FIELD;
    case 'container':
      return CONTAINER_FIELD;
  }
};

export const findInventoryFields = (type: InventoryItemType) => {
  const inventoryModel = findInventoryModel(type);
  if (LEGACY_TYPES.includes(type)) {
    const id = getFieldByType(type) || inventoryModel.fields.id;
    return {
      ...inventoryModel.fields,
      id,
    };
  } else {
    return inventoryModel.fields;
  }
};
