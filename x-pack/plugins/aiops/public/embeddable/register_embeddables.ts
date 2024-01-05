/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core-lifecycle-browser';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import type { AiopsPluginStart, AiopsPluginStartDeps } from '../types';
import { EmbeddableChangePointChartFactory } from './change_point_chart';
import { EmbeddableChangePointTableFactory } from './change_point_table';

export const registerEmbeddables = (
  core: CoreSetup<AiopsPluginStartDeps, AiopsPluginStart>,
  embeddable: EmbeddableSetup
) => {
  const embeddableChangePointChartFactory = new EmbeddableChangePointChartFactory(
    core.getStartServices
  );
  embeddable.registerEmbeddableFactory(
    embeddableChangePointChartFactory.type,
    embeddableChangePointChartFactory
  );

  const embeddableChangePointTableFactory = new EmbeddableChangePointTableFactory(
    core.getStartServices
  );
  embeddable.registerEmbeddableFactory(
    embeddableChangePointTableFactory.type,
    embeddableChangePointTableFactory
  );
};
