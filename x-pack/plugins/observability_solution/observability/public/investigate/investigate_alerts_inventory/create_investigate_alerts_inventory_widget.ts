/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createWidgetFactory } from '@kbn/investigate-plugin/public';
import { ALERTS_INVENTORY_WIDGET_NAME } from './constants';

export const createInvestigateAlertsInventoryWidget = createWidgetFactory<{
  relatedAlertUuid?: string;
  activeOnly?: boolean;
}>(ALERTS_INVENTORY_WIDGET_NAME);
