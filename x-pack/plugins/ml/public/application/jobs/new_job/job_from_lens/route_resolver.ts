/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import rison from '@kbn/rison';
import type { Query } from '@kbn/es-query';
import { Filter } from '@kbn/es-query';
import type { LensPublicStart, LensSavedObjectAttributes } from '@kbn/lens-plugin/public';
import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { TimefilterContract } from '@kbn/data-plugin/public';
import { SharePluginStart } from '@kbn/share-plugin/public';
import { QuickLensJobCreator } from './quick_create_job';
import { MlApiServices } from '../../../services/ml_api_service';

import { getSavedObjectsClient } from '../../../util/dependency_cache';
import { getDefaultQuery } from '../utils/new_job_utils';

/**
 * TODO update route resolver to use Kibana context instead of the deps cache
 */
export async function resolver(
  {
    lens,
    kibanaConfig,
    timeFilter,
    share,
    mlApiServices,
  }: {
    lens: LensPublicStart;
    kibanaConfig: IUiSettingsClient;
    timeFilter: TimefilterContract;
    share: SharePluginStart;
    mlApiServices: MlApiServices;
  },

  lensSavedObjectId: string | undefined,
  lensSavedObjectRisonString: string | undefined,
  fromRisonStrong: string,
  toRisonStrong: string,
  queryRisonString: string,
  filtersRisonString: string,
  layerIndexRisonString: string
) {
  let vis: LensSavedObjectAttributes;
  if (lensSavedObjectId) {
    vis = await getLensSavedObject(lensSavedObjectId);
  } else if (lensSavedObjectRisonString) {
    vis = rison.decode(lensSavedObjectRisonString) as unknown as LensSavedObjectAttributes;
  } else {
    throw new Error('Cannot create visualization');
  }

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
    from = rison.decode(fromRisonStrong) as string;
  } catch (error) {
    from = '';
  }
  try {
    to = rison.decode(toRisonStrong) as string;
  } catch (error) {
    to = '';
  }
  let layerIndex: number | undefined;
  try {
    layerIndex = rison.decode(layerIndexRisonString) as number;
  } catch (error) {
    layerIndex = undefined;
  }

  const jobCreator = new QuickLensJobCreator(lens, kibanaConfig, timeFilter, share, mlApiServices);
  await jobCreator.createAndStashADJob(vis, from, to, query, filters, layerIndex);
}

async function getLensSavedObject(id: string) {
  // @TODO: remove

  const savedObjectClient = getSavedObjectsClient();
  const so = await savedObjectClient.get<LensSavedObjectAttributes>('lens', id);
  return so.attributes;
}
