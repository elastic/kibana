/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
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

interface InventoryFields {
  message: string[];
  host: string;
  pod: string;
  container: string;
  timestamp: string;
  tiebreaker: string;
}

const LEGACY_TYPES = ['host', 'pod', 'container'];

const getFieldByType = (type: InventoryItemType, fields: InventoryFields) => {
  switch (type) {
    case 'pod':
      return fields.pod;
    case 'host':
      return fields.host;
    case 'container':
      return fields.container;
  }
};

export const findInventoryFields = (type: InventoryItemType, fields: InventoryFields) => {
  const inventoryModel = findInventoryModel(type);
  if (LEGACY_TYPES.includes(type)) {
    const id = getFieldByType(type, fields) || inventoryModel.fields.id;
    return {
      ...inventoryModel.fields,
      id,
    };
  } else {
    return inventoryModel.fields;
  }
};
