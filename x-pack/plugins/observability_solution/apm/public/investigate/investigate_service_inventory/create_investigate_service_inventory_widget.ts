/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createWidgetFactory } from '@kbn/investigate-plugin/public';
import { APM_SERVICE_INVENTORY_WIDGET_NAME } from '../../../common/investigate';
import type { InvestigateServiceInventoryWidgetParameters } from './types';

export const createInvestigateServiceInventoryWidget =
  createWidgetFactory<InvestigateServiceInventoryWidgetParameters>(
    APM_SERVICE_INVENTORY_WIDGET_NAME
  );
