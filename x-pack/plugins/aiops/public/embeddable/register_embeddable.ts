/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core-lifecycle-browser';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import type { AiopsPluginStart, AiopsPluginStartDeps } from '../types';
import { EmbeddableChangePointChartFactory } from './embeddable_change_point_chart_factory';

export const registerEmbeddable = (
  core: CoreSetup<AiopsPluginStartDeps, AiopsPluginStart>,
  embeddable: EmbeddableSetup
) => {
  const factory = new EmbeddableChangePointChartFactory(core.getStartServices);
  embeddable.registerEmbeddableFactory(factory.type, factory);
};
