/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CanvasFunction } from '../../../../../types';

// eslint-disable-next-line
import { demodata } from '../../../../../canvas_plugin_src/functions/server/demodata';

// eslint-disable-next-line
import { pointseries } from '../../../../../canvas_plugin_src/functions/server/pointseries';
import { functions } from '../../../../../canvas_plugin_src/functions/browser';

export const getFunctionDefinitions = () => {
  return [...functions, demodata, pointseries];
};

export const getFunctions = (): CanvasFunction[] => {
  return getFunctionDefinitions().map(fn => fn());
};
