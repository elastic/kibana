/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import rison from '@kbn/rison';
import type { Query } from '@kbn/es-query';
import { Filter } from '@kbn/es-query';
import { QuickJobCreator } from './quick_create_job';
import { ml } from '../../../services/ml_api_service';

import { getUiSettings, getTimefilter, getShare } from '../../../util/dependency_cache';
import { getDefaultQuery } from '../utils/new_job_utils';

export async function resolver(
  embeddable: any,
  dataView: any,
  geoField: string,
  splitField: string,
  bucketSpan: string,
  fromRisonString: string,
  toRisonString: string,
  queryRisonString: string,
  filtersRisonString: string
) {
  let query: Query;
  let filters: Filter[];
  try {
    query = rison.decode(queryRisonString) as Query;
  } catch (error) {
    query = getDefaultQuery();
  }
  try {
    filters = rison.decode(filtersRisonString) as Filter[];
  } catch (error) {
    filters = [];
  }

  let from: string;
  let to: string;
  try {
    from = rison.decode(fromRisonString) as string;
  } catch (error) {
    from = '';
  }
  try {
    to = rison.decode(toRisonString) as string;
  } catch (error) {
    to = '';
  }

  const jobCreator = new QuickJobCreator(getUiSettings(), getTimefilter(), getShare(), ml);
  await jobCreator.createAndStashGeoJob(
    embeddable,
    dataView,
    from,
    to,
    query,
    filters,
    bucketSpan,
    geoField,
    splitField
  );
}
