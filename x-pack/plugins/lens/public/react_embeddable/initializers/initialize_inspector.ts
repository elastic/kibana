/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noop } from 'lodash';
import { getLensInspectorService } from '../../lens_inspector_service';
import { emptySerializer } from '../helper';
import type { LensEmbeddableStartServices } from '../types';

export function initializeInspector(services: LensEmbeddableStartServices) {
  return {
    api: getLensInspectorService(services.inspector),
    comparators: {},
    serialize: emptySerializer,
    cleanup: noop,
  };
}
