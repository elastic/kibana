/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Subject } from 'rxjs';

import { Refresh } from '../routing/use_refresh';

export const mlTimefilterRefresh$ = new Subject<Required<Refresh>>();
