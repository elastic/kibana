/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Rule } from '@kbn/alerting-plugin/common';
import type { TopAlert } from '@kbn/observability-plugin/public';
import { SerializedTitles } from '@kbn/presentation-publishing';
import type { BoolQuery } from '@kbn/es-query';

export interface EmbeddableApmAlertingVizProps extends SerializedTitles {
  rule: Rule;
  alert: TopAlert;
  transactionName?: string;
  rangeFrom?: string;
  rangeTo?: string;
  kuery?: string;
  filters?: BoolQuery;
  serviceName: string;
  environment?: string;
  transactionType?: string;
}

export interface EmbeddableApmAlertingLatencyVizProps extends EmbeddableApmAlertingVizProps {
  latencyThresholdInMicroseconds?: number;
}
