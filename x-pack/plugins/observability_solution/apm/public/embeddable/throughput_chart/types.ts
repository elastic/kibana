/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EmbeddableInput } from '@kbn/embeddable-plugin/public';

export interface EmbeddableAPMThroughputChartProps {
  serviceName: string;
  environment?: string;
  transactionType?: string;
  transactionName?: string;
  rangeFrom?: string;
  rangeTo?: string;
}

export type APMThroughputChartEmbeddableInput = EmbeddableInput &
  EmbeddableAPMThroughputChartProps;
