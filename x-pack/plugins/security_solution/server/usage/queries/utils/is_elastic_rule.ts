/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTERNAL_IMMUTABLE_KEY } from '../../../../common/constants';

export const isElasticRule = (tags: string[] = []) =>
  tags.includes(`${INTERNAL_IMMUTABLE_KEY}:true`);
