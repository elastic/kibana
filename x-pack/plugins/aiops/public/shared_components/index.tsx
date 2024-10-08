/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { dynamic } from '@kbn/shared-ux-utility';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { AiopsPluginStartDeps } from '../types';
import type { ChangePointDetectionSharedComponent } from './change_point_detection';
import type { PatternAnalysisSharedComponent } from './pattern_analysis';

const ChangePointDetectionLazy = dynamic(async () => import('./change_point_detection'));

export const getChangePointDetectionComponent = (
  coreStart: CoreStart,
  pluginStart: AiopsPluginStartDeps
): ChangePointDetectionSharedComponent => {
  return React.memo((props) => {
    return <ChangePointDetectionLazy coreStart={coreStart} pluginStart={pluginStart} {...props} />;
  });
};

export type { ChangePointDetectionSharedComponent } from './change_point_detection';

const PatternAnalysisLazy = dynamic(async () => import('./pattern_analysis'));

export const getPatternAnalysisComponent = (
  coreStart: CoreStart,
  pluginStart: AiopsPluginStartDeps
): PatternAnalysisSharedComponent => {
  return React.memo((props) => {
    return <PatternAnalysisLazy coreStart={coreStart} pluginStart={pluginStart} {...props} />;
  });
};

export type { PatternAnalysisSharedComponent } from './pattern_analysis';
