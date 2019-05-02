/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { editorFrameSetup, editorFrameStop } from '../editor_frame_plugin';
import { App } from './app';
import { indexPatternDatasourceSetup, indexPatternDatasourceStop } from '../indexpattern_plugin';

export class AppPlugin {
  constructor() {}

  setup() {
    const indexPattern = indexPatternDatasourceSetup();
    const editorFrame = editorFrameSetup();

    editorFrame.registerDatasource('indexpattern', indexPattern);

    return <App editorFrame={editorFrame} />;
  }

  stop() {
    indexPatternDatasourceStop();
    editorFrameStop();
  }
}

const app = new AppPlugin();

export const appSetup = () => app.setup();
export const appStop = () => app.stop();
