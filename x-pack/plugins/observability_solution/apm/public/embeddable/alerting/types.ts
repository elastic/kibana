/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmbeddableInput } from '@kbn/embeddable-plugin/public';
import type { Rule } from '@kbn/alerting-plugin/common';
import type { TopAlert } from '@kbn/observability-plugin/public';
import type { BoolQuery } from '@kbn/es-query';

export interface EmbeddableAPMAlertingVizProps {
  rule: Rule;
  alert: TopAlert;
  transactionName?: string;
  rangeFrom?: string;
  rangeTo?: string;
  timeZone: string;
  latencyThresholdInMicroseconds?: number;
  filters?: BoolQuery;
}

export type APMAlertingVizEmbeddableInput = EmbeddableInput &
  EmbeddableAPMAlertingVizProps & {
    serviceName: string;
    environment?: string;
    transactionType?: string;
    kuery?: string;
  };
