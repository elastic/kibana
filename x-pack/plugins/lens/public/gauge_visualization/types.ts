/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PaletteOutput } from 'src/plugins/charts/public';

export interface GaugeState {
  layerId: string;
  accessor?: string;
  target?: number;
  min?: number;
  max?: number;
  subTitle?: string;
  type: 'goal' | 'horizontalBullet' | 'verticalBullet';
  palette?: PaletteOutput;
}

export interface GaugeConfig extends GaugeState {
  title: string;
  description: string;
  gaugeTitle: string;
  mode: 'reduced' | 'full';
}
