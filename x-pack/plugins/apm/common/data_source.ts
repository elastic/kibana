/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApmDocumentType } from './document_type';
import { RollupInterval } from './rollup';

type AnyApmDocumentType =
  | ApmDocumentType.ServiceTransactionMetric
  | ApmDocumentType.TransactionMetric
  | ApmDocumentType.TransactionEvent
  | ApmDocumentType.ServiceDestinationMetric
  | ApmDocumentType.ServiceSummaryMetric
  | ApmDocumentType.ErrorEvent;

export interface ApmDataSource<
  TDocumentType extends AnyApmDocumentType = AnyApmDocumentType
> {
  rollupInterval: RollupInterval;
  documentType: TDocumentType;
}
