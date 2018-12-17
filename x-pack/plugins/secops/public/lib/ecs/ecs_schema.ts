/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EcsNamespace } from './ecs_namespace';

/**
 * The Elastic Common Schema (ECS) https://github.com/elastic/ecs
 * is defined as a map of `EcsNamespace.name` `->` `EcsNamespace`
 */
export interface EcsSchema {
  [namespaceName: string]: EcsNamespace;
}
