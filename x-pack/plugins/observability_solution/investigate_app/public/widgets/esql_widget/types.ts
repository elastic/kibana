/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigateWidgetCreate } from '@kbn/investigate-plugin/common';
import type { Suggestion } from '@kbn/lens-plugin/public';

export interface EsqlWidgetParameters {
  esql: string;
  suggestion?: Suggestion;
}

export type EsqlWidgetCreate = InvestigateWidgetCreate<EsqlWidgetParameters>;
