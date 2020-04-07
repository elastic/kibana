/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ESTooltipProperty } from './es_tooltip_property';

export class ESAggTooltipProperty extends ESTooltipProperty {
  isFilterable(): boolean {
    return false;
  }
}
