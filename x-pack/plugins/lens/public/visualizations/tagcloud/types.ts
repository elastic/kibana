/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { $Values } from '@kbn/utility-types';
import { Datatable } from '@kbn/expressions-plugin/common';
import { PaletteOutput, ColorMapping } from '@kbn/coloring';
import { Orientation } from '@kbn/expression-tagcloud-plugin/common';

export interface TagcloudState {
  layerId: string;
  tagAccessor?: string;
  valueAccessor?: string;
  maxFontSize: number;
  minFontSize: number;
  orientation: $Values<typeof Orientation>;
  palette?: PaletteOutput;
  showLabel: boolean;
  colorMapping?: ColorMapping.Config;
}

export interface TagcloudConfig extends TagcloudState {
  title: string;
  description: string;
}

export interface TagcloudProps {
  data: Datatable;
  args: TagcloudConfig;
}
