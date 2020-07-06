/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Coordinate } from '../../../../typings/timeseries';
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters,
} from '../../helpers/setup_request';
import { fetcher } from './fetcher';
import { transformer } from './transformer';

export interface Options {
  serviceName: string;
  setup: Setup & SetupTimeRange & SetupUIFilters;
}

export type AvgDurationByBrowserAPIResponse = Array<{
  data: Coordinate[];
  title: string;
}>;

export async function getTransactionAvgDurationByBrowser(options: Options) {
  return transformer({ response: await fetcher(options) });
}
