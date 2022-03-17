/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EventAnnotationConfig,
  EventAnnotationOutput,
} from '../../../../../../../src/plugins/event_annotation/common';
import type { ExpressionFunctionDefinition } from '../../../../../../../src/plugins/expressions/common';
import { layerTypes } from '../../../constants';

export interface XYAnnotationLayerConfig {
  layerId: string;
  layerType: typeof layerTypes.ANNOTATIONS;
  annotations: EventAnnotationConfig[];
  hide?: boolean;
}

export interface AnnotationLayerArgs {
  annotations: EventAnnotationOutput[];
  layerId: string;
  layerType: typeof layerTypes.ANNOTATIONS;
  hide?: boolean;
}
export type XYAnnotationLayerArgsResult = AnnotationLayerArgs & {
  type: 'lens_xy_annotation_layer';
};
export function annotationLayerConfig(): ExpressionFunctionDefinition<
  'lens_xy_annotation_layer',
  null,
  AnnotationLayerArgs,
  XYAnnotationLayerArgsResult
> {
  return {
    name: 'lens_xy_annotation_layer',
    aliases: [],
    type: 'lens_xy_annotation_layer',
    inputTypes: ['null'],
    help: 'Annotation layer in lens',
    args: {
      layerId: {
        types: ['string'],
        help: '',
      },
      layerType: { types: ['string'], options: [layerTypes.ANNOTATIONS], help: '' },
      hide: {
        types: ['boolean'],
        default: false,
        help: 'Show details',
      },
      annotations: {
        types: ['manual_event_annotation'],
        help: '',
        multi: true,
      },
    },
    fn: (input, args) => {
      return {
        type: 'lens_xy_annotation_layer',
        ...args,
      };
    },
  };
}
