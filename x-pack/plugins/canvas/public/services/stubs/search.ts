/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginServiceFactory } from '../../../../../../src/plugins/presentation_util/public';

import { CanvasSearchService } from '../search';

type CanvasSearchServiceFactory = PluginServiceFactory<CanvasSearchService>;

export const searchServiceFactory: CanvasSearchServiceFactory = () => ({
  // @ts-expect-error This needs work
  search: () => {},
});
