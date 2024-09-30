/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewField, DataView } from '@kbn/data-views-plugin/common';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { Query, TimeRange } from '@kbn/es-query';
import { ML_APP_LOCATOR } from '../../../../../common/constants/locator';
import { ML_PAGES } from '../../../../locator';
import type { CategorizationType } from './quick_create_job';

export async function redirectToADJobWizards(
  categorizationType: CategorizationType,
  dataView: DataView,
  field: DataViewField,
  partitionField: DataViewField | null,
  stopOnWarn: boolean,
  query: QueryDslQueryContainer,
  timeRange: TimeRange,
  share: SharePluginStart
) {
  const locator = share.url.locators.get(ML_APP_LOCATOR)!;

  const url = await locator.getUrl({
    page: ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_FROM_PATTERN_ANALYSIS,
    pageState: {
      categorizationType,
      dataViewId: dataView.id,
      field: field.name,
      partitionField: partitionField?.name || null,
      stopOnWarn,
      from: timeRange.from,
      to: timeRange.to,
      query: query as Query,
    },
  });

  window.open(url, '_blank');
}
