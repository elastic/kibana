/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createWidgetFactory } from '../create_widget';
import { ESQL_WIDGET_NAME } from './constants';
import type { EsqlWidgetParameters } from './types';

export const createEsqlWidget = createWidgetFactory<EsqlWidgetParameters>(ESQL_WIDGET_NAME);
