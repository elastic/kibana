/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import type { Embeddable } from '@kbn/lens-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { TimeRange } from '@kbn/es-query';
import { createFlyout } from '../common/create_flyout_temp';
import { CreateCategorizationJobFlyout } from './flyout';

export async function showPatternAnalysisToADJobFlyout(
  dataView: DataView,
  field: DataViewField,
  query: QueryDslQueryContainer,
  timeRange: TimeRange,
  coreStart: CoreStart,
  share: SharePluginStart,
  data: DataPublicPluginStart,
  lens: LensPublicStart,
  dashboardService: DashboardStart
): Promise<void> {
  return createFlyout(
    CreateCategorizationJobFlyout,
    { dataView, field, query, timeRange },
    coreStart,
    share,
    data,
    dashboardService,
    lens
  );
}
