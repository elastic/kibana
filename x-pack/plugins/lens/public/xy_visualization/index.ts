/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/public';
import { EventAnnotationPluginSetup } from '@kbn/event-annotation-plugin/public';
import type { ExpressionsSetup } from '@kbn/expressions-plugin/public';
import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import { LEGACY_TIME_AXIS } from '@kbn/charts-plugin/common';
import type { EditorFrameSetup } from '../types';
import type { LensPluginStartDependencies } from '../plugin';
import type { FormatFactory } from '../../common';

export interface XyVisualizationPluginSetupPlugins {
  expressions: ExpressionsSetup;
  formatFactory: FormatFactory;
  editorFrame: EditorFrameSetup;
  charts: ChartsPluginSetup;
  eventAnnotation: EventAnnotationPluginSetup;
}

export class XyVisualization {
  setup(
    core: CoreSetup<LensPluginStartDependencies, void>,
    { editorFrame }: XyVisualizationPluginSetupPlugins
  ) {
    editorFrame.registerVisualization(async () => {
      const { getXyVisualization } = await import('../async_services');
      const [, { charts, fieldFormats, eventAnnotation }] = await core.getStartServices();
      const palettes = await charts.palettes.getPalettes();
      const eventAnnotationService = await eventAnnotation.getService();
      const useLegacyTimeAxis = core.uiSettings.get(LEGACY_TIME_AXIS);
      return getXyVisualization({
        paletteService: palettes,
        eventAnnotationService,
        fieldFormats,
        useLegacyTimeAxis,
        kibanaTheme: core.theme,
      });
    });
  }
}
