/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigateWidget } from '@kbn/investigate-plugin/common';

export interface InvestigateServiceInventoryWidgetParameters {
  environment: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface InvestigateServiceInventoryData {}

export type InvestigateServiceInventoryWidget = InvestigateWidget<
  InvestigateServiceInventoryWidgetParameters,
  InvestigateServiceInventoryData
>;
