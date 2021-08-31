/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  projectIDs,
  PresentationLabsService,
} from '../../../../../src/plugins/presentation_util/public';

export interface CanvasLabsService extends PresentationLabsService {
  projectIDs: typeof projectIDs;
  isLabsEnabled: () => boolean;
}
