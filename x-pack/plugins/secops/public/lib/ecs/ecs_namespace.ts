/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EcsField } from './ecs_field';

/** A namespace in the Elastic Common Schema (ECS) https://github.com/elastic/ecs */
export interface EcsNamespace {
  description: string;
  fields: { [fieldName: string]: EcsField };
  group: number;
  name: string;
  title: string;
  type: string;
}
