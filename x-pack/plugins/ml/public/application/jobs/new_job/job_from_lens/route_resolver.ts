/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import rison from 'rison-node';
import { Query } from '@kbn/data-plugin/public';
import { Filter } from '@kbn/es-query';
import type { LensSavedObjectAttributes } from '@kbn/lens-plugin/public';
import { canCreateAndStashADJob } from './create_job';
import { getUiSettings, getDataViews, getSavedObjectsClient } from '../../../util/dependency_cache';

export async function resolver(
  lensId: string | undefined,
  vis: any | undefined,
  from: string,
  to: string,
  queryRisonString: string,
  filtersRisonString: string
) {
  let viz: LensSavedObjectAttributes;
  if (lensId) {
    viz = await getLensSavedObject(lensId);
  } else if (vis) {
    viz = rison.decode(vis) as unknown as LensSavedObjectAttributes;
  } else {
    throw new Error('Cannot create visualization');
  }

  let query: Query;
  let filters: Filter[];
  try {
    query = rison.decode(queryRisonString) as Query;
    filters = rison.decode(filtersRisonString) as Filter[];
  } catch (error) {
    query = { language: 'lucene', query: '' };
    filters = [];
  }

  const dataViewClient = getDataViews();
  const kibanaConfig = getUiSettings();

  await canCreateAndStashADJob(viz, from, to, query, filters, dataViewClient, kibanaConfig);
}

async function getLensSavedObject(id: string) {
  const savedObjectClient = getSavedObjectsClient();
  const so = await savedObjectClient.get<LensSavedObjectAttributes>('lens', id);
  return so.attributes;
}
