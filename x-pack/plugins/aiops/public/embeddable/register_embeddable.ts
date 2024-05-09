/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core-lifecycle-browser';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import { EMBEDDABLE_CHANGE_POINT_CHART_TYPE } from '@kbn/aiops-change-point-detection/constants';
import type { AiopsPluginStart, AiopsPluginStartDeps } from '../types';
import { EmbeddableChangePointChartFactory } from './embeddable_change_point_chart_factory';

export const registerEmbeddable = (
  core: CoreSetup<AiopsPluginStartDeps, AiopsPluginStart>,
  embeddable: EmbeddableSetup
) => {
  const changePointChartFactory = new EmbeddableChangePointChartFactory(
    EMBEDDABLE_CHANGE_POINT_CHART_TYPE,
    i18n.translate('xpack.aiops.embeddableChangePointChartDisplayName', {
      defaultMessage: 'Change point detection',
    }),
    core.getStartServices
  );
  embeddable.registerEmbeddableFactory(changePointChartFactory.type, changePointChartFactory);
};
