/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { Query } from 'src/plugins/data/public';
import { StyleDescriptor, VectorStyleDescriptor } from './style_property_descriptor_types';
import { DataRequestDescriptor } from './data_request_descriptor_types';
import { AbstractSourceDescriptor, ESTermSourceDescriptor } from './source_descriptor_types';

export type JoinDescriptor = {
  leftField?: string;
  right: ESTermSourceDescriptor;
};

export type LayerDescriptor = {
  __dataRequests?: DataRequestDescriptor[];
  __isInErrorState?: boolean;
  __isPreviewLayer?: boolean;
  __errorMessage?: string;
  __trackedLayerDescriptor?: LayerDescriptor;
  alpha?: number;
  id: string;
  joins?: JoinDescriptor[];
  label?: string | null;
  areLabelsOnTop?: boolean;
  minZoom?: number;
  maxZoom?: number;
  sourceDescriptor: AbstractSourceDescriptor | null;
  type?: string;
  visible?: boolean;
  style?: StyleDescriptor | null;
  query?: Query;
};

export type VectorLayerDescriptor = LayerDescriptor & {
  style: VectorStyleDescriptor;
};
