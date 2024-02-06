/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewsService } from '@kbn/data-views-plugin/common';
import type { Logger } from '@kbn/core/server';
import {
  LATEST_FINDINGS_INDEX_PATTERN_ID,
  LATEST_VULNERABILITIES_INDEX_PATTERN_ID,
} from '../../common/constants';
import { latestFindingsDataViewLabels } from './latest_findings_data_view_labels';
import { latestVulnerabilitiesDataViewLabels } from './latest_vulnerabilities_data_view_labels';

export const updateCspDataViews = async (dataViewsService: DataViewsService, logger: Logger) => {
  const [updateFindingsLatestDataViewPromise, updateVulnerabilitiesLatestDataViewPromise] =
    await Promise.allSettled([
      updateDataView(
        dataViewsService,
        LATEST_FINDINGS_INDEX_PATTERN_ID,
        latestFindingsDataViewLabels,
        logger
      ),
      updateDataView(
        dataViewsService,
        LATEST_VULNERABILITIES_INDEX_PATTERN_ID,
        latestVulnerabilitiesDataViewLabels,
        logger
      ),
    ]);

  if (updateFindingsLatestDataViewPromise.status === 'rejected') {
    logger.error(updateFindingsLatestDataViewPromise.reason);
  }
  if (updateVulnerabilitiesLatestDataViewPromise.status === 'rejected') {
    logger.error(updateVulnerabilitiesLatestDataViewPromise.reason);
  }
};

const updateDataView = async (
  dataViewsService: DataViewsService,
  dataViewId: string,
  labels: Record<string, string>,
  logger: Logger
) => {
  try {
    const dataView = await dataViewsService.get(dataViewId);

    Object.entries(labels).forEach(([field, label]) => {
      const fieldCustomLabel = dataView.getFieldAttrs()[field]?.customLabel;
      // If the field has a custom label and it's different from the field name, don't update it
      if (fieldCustomLabel && fieldCustomLabel !== field) {
        return;
      }
      dataView.setFieldCustomLabel(field, label);
    });

    return await dataViewsService.updateSavedObject(dataView);
  } catch (e) {
    logger.warn(`Failed to update data view ${dataViewId}`);
    logger.warn(e);
    return false;
  }
};
