/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { Embeddable } from '@kbn/lens-plugin/public';
import { getJobsItemsFromEmbeddable } from './utils';
import { ML_PAGES, ML_APP_LOCATOR } from '../../../../../common/constants/locator';

export async function convertLensToADJob(
  embeddable: Embeddable,
  share: SharePluginStart,
  layerIndex?: number
) {
  const { query, filters, to, from, vis } = getJobsItemsFromEmbeddable(embeddable);
  const locator = share.url.locators.get(ML_APP_LOCATOR);

  const url = await locator?.getUrl({
    page: ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_FROM_LENS,
    pageState: {
      vis: vis as any,
      from,
      to,
      query,
      filters,
      layerIndex,
    },
  });

  window.open(url, '_blank');
}
