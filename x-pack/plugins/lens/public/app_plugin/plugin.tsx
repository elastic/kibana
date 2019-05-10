/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { editorFrameSetup, editorFrameStop } from '../editor_frame_plugin';
import { indexPatternDatasourceSetup, indexPatternDatasourceStop } from '../indexpattern_plugin';
import { xyVisualizationSetup, xyVisualizationStop } from '../xy_visualization_plugin';
import { App } from './app';

export class AppPlugin {
  constructor() {}

  setup() {
    // TODO: These plugins should not be called from the top level, but since this is the
    // entry point to the app we have no choice until the new platform is ready
    const indexPattern = indexPatternDatasourceSetup();
    const xyVisualization = xyVisualizationSetup();
    const editorFrame = editorFrameSetup();

    editorFrame.registerDatasource('indexpattern', indexPattern);
    editorFrame.registerVisualization('xy', xyVisualization);

    return <App editorFrame={editorFrame} />;
  }

  stop() {
    indexPatternDatasourceStop();
    xyVisualizationStop();
    editorFrameStop();
  }
}

const app = new AppPlugin();

export const appSetup = () => app.setup();
export const appStop = () => app.stop();
