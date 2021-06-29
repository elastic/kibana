/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IIndexPattern } from 'src/plugins/data/common';

export function loadSavedDashboards(maxNumber: number): Promise<any[]>;
export function loadIndexPatterns(maxNumber: number): Promise<IIndexPattern[]>;
