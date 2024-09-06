/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { investigationSchema } from '@kbn/investigation-shared';
import * as t from 'io-ts';

export type Investigation = t.TypeOf<typeof investigationSchema>;
export type StoredInvestigation = t.OutputOf<typeof investigationSchema>;
