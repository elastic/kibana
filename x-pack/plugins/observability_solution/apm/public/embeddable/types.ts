/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Rule } from '@kbn/alerting-plugin/common';
import { TopAlert } from '@kbn/observability-plugin/public';
import { EmbeddableInput } from '@kbn/embeddable-plugin/public';

export interface APMEmbeddableProps {
  serviceName: string;
  environment?: string;
  transactionType?: string;
  transactionName?: string;
  rangeFrom?: string;
  rangeTo?: string;
}

export type APMEmbeddableInput = EmbeddableInput & APMEmbeddableProps;

export interface APMAlertingEmbeddableProps {
  alert: TopAlert;
  serviceName: string;
  environment?: string;
  rule: Rule;
  rangeFrom?: string;
  rangeTo?: string;
  transactionType?: string;
  transactionName?: string;
  timeZone: string;
  latencyThresholdInMicroseconds?: number;
}

export type APMAlertingEmbeddableInput = EmbeddableInput &
  APMAlertingEmbeddableProps;
