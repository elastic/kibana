/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import rison from '@kbn/rison';
import { i18n } from '@kbn/i18n';
import type { Query } from '@kbn/es-query';
import type { Filter } from '@kbn/es-query';
import type { LensPublicStart, LensSavedObjectAttributes } from '@kbn/lens-plugin/public';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { LensGetIn, LensGetOut } from '@kbn/lens-plugin/common/content_management/v1';
import { QuickLensJobCreator } from './quick_create_job';
import type { MlApiServices } from '../../../services/ml_api_service';

import { getDefaultQuery } from '../utils/new_job_utils';

export async function resolver(
  {
    contentManagement,
    lens,
    kibanaConfig,
    timeFilter,
    share,
    mlApiServices,
  }: {
    contentManagement: ContentManagementPublicStart;
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
  let vis: LensSavedObjectAttributes | undefined;
  if (lensSavedObjectId) {
    try {
      const lensObj = await contentManagement.client.get<LensGetIn, LensGetOut>({
        contentTypeId: 'lens',
        id: lensSavedObjectId,
      });

      // @ts-expect-error LensSavedObjectAttributes from Len's content management API currently differs from public export
      vis = { ...lensObj.item.attributes, references: lensObj.item.references };
    } catch (err) {
      throw new Error(
        i18n.translate('xpack.ml.newJob.fromLens.createJob.error.getLensContentError', {
          defaultMessage: `Cannot find Lens content with id {lensSavedObjectId}. Got {err}`,
          values: { lensSavedObjectId, err },
        })
      );
    }
  } else if (lensSavedObjectRisonString) {
    vis = rison.decode(lensSavedObjectRisonString) as unknown as LensSavedObjectAttributes;
  }

  if (!vis) {
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
