/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { VisualizationsStart } from '../../../../../src/plugins/visualizations/public';

export interface CanvasVisualizationsService {
  showNewVisModal: VisualizationsStart['showNewVisModal'];
  getByGroup: VisualizationsStart['getByGroup'];
  getAliases: VisualizationsStart['getAliases'];
}
