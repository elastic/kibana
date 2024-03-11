/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HasLibraryTransforms, PublishesWritableLocalUnifiedSearch } from '@kbn/presentation-publishing';
import type {
  DefaultEmbeddableApi,
} from '@kbn/embeddable-plugin/public';
import type { MapEmbeddableInput } from '../embeddable/types';

export type MapApi = DefaultEmbeddableApi & 
HasLibraryTransforms<MapEmbeddableInput> &
  Pick<PublishesWritableLocalUnifiedSearch, 'localTimeRange' | 'setLocalTimeRange'>;