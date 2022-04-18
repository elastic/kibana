/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewListItem } from '@kbn/data-views-plugin/common';

export function loadSavedDashboards(maxNumber: number): Promise<any[]>;
export function loadDataViewListItems(): Promise<DataViewListItem[]>;
