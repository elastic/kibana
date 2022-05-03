/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SimpleSavedObject } from '@kbn/core/public';
import rison from 'rison-node';
import type { LensSavedObjectAttributes } from '@kbn/lens-plugin/public';
import { getSavedObjectsClient } from '../../../../util/dependency_cache';
import { canCreateAndStashADJob } from './create_job';
import { getUiSettings, getDataViews } from '../../../../util/dependency_cache';

export async function resolver(
  lensId: string | undefined,
  vis: any | undefined,
  from: string,
  to: string,
  queryRisonString: any,
  filtersRisonsString: any
) {
  let viz: SimpleSavedObject<LensSavedObjectAttributes>;
  if (lensId) {
    viz = await getLensSavedObject(lensId);
  } else if (vis) {
    viz = rison.decode(vis) as unknown as SimpleSavedObject<LensSavedObjectAttributes>;
  } else {
    throw new Error('Cannot create visualization');
  }

  let query;
  let filters;
  try {
    query = rison.decode(queryRisonString);
    filters = rison.decode(filtersRisonsString);
  } catch (error) {
    // ignore
  }

  const dataViewClient = getDataViews();
  const kibanaConfig = getUiSettings();

  await canCreateAndStashADJob(viz, from, to, query, filters, dataViewClient, kibanaConfig);
}

async function getLensSavedObject(id: string) {
  const savedObjectClient = getSavedObjectsClient();
  return savedObjectClient.get<LensSavedObjectAttributes>('lens', id);
}
