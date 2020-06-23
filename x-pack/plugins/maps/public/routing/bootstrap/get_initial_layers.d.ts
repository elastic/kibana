/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LayerDescriptor } from '../../../common/descriptor_types';

export function getInitialLayers(
  layerListJSON?: string,
  initialLayers?: LayerDescriptor[]
): LayerDescriptor[];
