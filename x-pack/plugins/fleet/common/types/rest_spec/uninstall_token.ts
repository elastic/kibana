/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UninstallToken } from '../models/uninstall_token';

import type { ListResult } from './common';

export type GetUninstallTokensResponse = ListResult<UninstallToken>;
