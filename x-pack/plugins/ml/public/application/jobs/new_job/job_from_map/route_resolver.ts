/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import rison from '@kbn/rison';
import type { Query } from '@kbn/es-query';
import { Filter } from '@kbn/es-query';
import { QuickGeoJobCreator } from './quick_create_job';
import { ml } from '../../../services/ml_api_service';

import { getUiSettings, getTimefilter, getShare } from '../../../util/dependency_cache';
import { getDefaultQuery } from '../utils/new_job_utils';

export async function resolver(
  dashboard: string,
  dataViewId: string,
  embeddable: string,
  geoField: string,
  splitField: string,
  fromRisonString: string,
  toRisonString: string,
  layer?: string
) {
  let decodedDashboard;
  let decodedEmbeddable;
  let decodedLayer;
  let splitFieldDecoded;
  let dvId;

  try {
    dvId = rison.decode(dataViewId) as string;
  } catch (error) {
    dvId = '';
  }

  try {
    decodedDashboard = rison.decode(dashboard) as { query: Query; filters: Filter[] };
  } catch (error) {
    decodedDashboard = { query: getDefaultQuery(), filters: [] };
  }

  try {
    decodedEmbeddable = rison.decode(embeddable) as { query: Query; filters: Filter[] };
  } catch (error) {
    decodedEmbeddable = { query: getDefaultQuery(), filters: [] };
  }

  if (layer) {
    try {
      decodedLayer = rison.decode(layer) as { query: Query };
    } catch (error) {
      decodedLayer = { query: getDefaultQuery(), filters: [] };
    }
  }

  try {
    splitFieldDecoded = rison.decode(splitField) as string;
  } catch (error) {
    splitFieldDecoded = null;
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

  const jobCreator = new QuickGeoJobCreator(getUiSettings(), getTimefilter(), getShare(), ml);

  await jobCreator.createAndStashGeoJob(
    dvId,
    from,
    to,
    decodedDashboard.query,
    decodedDashboard.filters,
    decodedEmbeddable.query,
    decodedEmbeddable.filters,
    geoField,
    splitFieldDecoded,
    decodedLayer?.query
  );
}
