/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChartType } from '../explorer/explorer_constants';

export declare function numTicksForDateFormat(axisWidth: number, dateFormat: string): number;
export declare function getChartType(config: any): ChartType;
