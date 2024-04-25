/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EmbeddableInput } from '@kbn/embeddable-plugin/public';
import { Rule } from '@kbn/alerting-plugin/common';
import { TopAlert } from '@kbn/observability-plugin/public';

export interface EmbeddableAPMAlertingVizProps {
  rule: Rule;
  alert: TopAlert;
  transactionName?: string;
  rangeFrom?: string;
  rangeTo?: string;
  timeZone: string;
  latencyThresholdInMicroseconds?: number;
}

export type APMAlertingVizEmbeddableInput = EmbeddableInput &
  EmbeddableAPMAlertingVizProps & {
    serviceName: string;
    environment?: string;
    transactionType?: string;
    kuery?: string;
    filters?: string;
  };
