/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createWidgetFactory } from '@kbn/investigate-plugin/public';
import { SLO_DETAIL_WIDGET_NAME } from '../constants';
import type { InvestigateSloDetailWidgetParameters } from './types';

export const createInvestigateSloDetailWidget =
  createWidgetFactory<InvestigateSloDetailWidgetParameters>(SLO_DETAIL_WIDGET_NAME);
