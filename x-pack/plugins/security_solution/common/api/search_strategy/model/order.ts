/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Direction } from '@kbn/timelines-plugin/common';

export { Direction };

import { z } from 'zod';

export const order = z.enum([Direction.asc, Direction.desc]);
