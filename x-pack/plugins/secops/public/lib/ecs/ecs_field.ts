/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/** A field in the Elastic Common Schema (ECS) https://github.com/elastic/ecs */
export interface EcsField {
  description: string;
  example: string;
  footnote: string;
  group: number;
  level: string;
  name: string;
  required: boolean;
  type: string;
}
