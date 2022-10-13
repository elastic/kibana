/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseRoute } from './types';

export const createCasesRoute = <P, Q, B>(route: CaseRoute<P, Q, B>) => route;
