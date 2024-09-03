/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { investigationItemSchema } from '@kbn/investigation-shared';

export type InvestigationItem = t.TypeOf<typeof investigationItemSchema>;
export type StoredInvestigationItem = t.OutputOf<typeof investigationItemSchema>;
