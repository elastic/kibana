/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum ApmDocumentType {
  TransactionMetric = 'transactionMetric',
  ServiceTransactionMetric = 'serviceTransactionMetric',
  TransactionEvent = 'transactionEvent',
  ServiceDestinationMetric = 'serviceDestinationMetric',
  ServiceSummaryMetric = 'serviceSummaryMetric',
  ErrorEvent = 'error',
}

export type ApmServiceTransactionDocumentType =
  | ApmDocumentType.ServiceTransactionMetric
  | ApmDocumentType.TransactionMetric
  | ApmDocumentType.TransactionEvent;

export type ApmTransactionDocumentType =
  | ApmDocumentType.TransactionMetric
  | ApmDocumentType.TransactionEvent;
