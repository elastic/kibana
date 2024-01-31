/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewsService } from '@kbn/data-views-plugin/common';
import { Logger } from '@kbn/logging';
import { latestFindingsDataViewLabels } from './latest_findings_data_view';

const latestFindingsDataViewId = 'cloud_security_posture-303eea10-c475-11ec-af18-c5b9b437dbbe';

export const updateCspDataViews = async (dataViewsService: DataViewsService, logger: Logger) => {
  const [updateFindingsLatestDataViewPromise] = await Promise.allSettled([
    updateDataView(
      dataViewsService,
      latestFindingsDataViewId,
      latestFindingsDataViewLabels,
      logger
    ),
  ]);

  if (updateFindingsLatestDataViewPromise.status === 'rejected') {
    logger.error(updateFindingsLatestDataViewPromise.reason);
  }
  // if (updateVulnerabilitiesLatestDataViewPromise.status === 'rejected') {
  //   logger.error(updateVulnerabilitiesLatestDataViewPromise.reason);
  // }
};

const updateDataView = async (
  dataViewsService: DataViewsService,
  dataViewId: string,
  labels: Record<string, string>,
  logger: Logger
) => {
  try {
    const latestFindingsDataView = await dataViewsService.get(dataViewId);

    Object.entries(labels).forEach(([field, label]) => {
      latestFindingsDataView.setFieldCustomLabel(field, label);
    });

    return await dataViewsService.updateSavedObject(latestFindingsDataView);
  } catch (e) {
    logger.error(`Failed to update data view ${dataViewId}`);
    logger.error(e);
    return false;
  }
};
