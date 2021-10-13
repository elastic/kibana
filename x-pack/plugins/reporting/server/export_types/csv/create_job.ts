/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNil, omitBy } from 'lodash';
import type { DataView } from 'src/plugins/data_views/common';
import { CreateJobFn, CreateJobFnFactory } from '../../types';
import { JobParamsDeprecatedCSV, TaskPayloadDeprecatedCSV } from './types';

export const createJobFnFactory: CreateJobFnFactory<
  CreateJobFn<JobParamsDeprecatedCSV, TaskPayloadDeprecatedCSV>
> = function createJobFactoryFn(reporting, logger) {
  return async function createJob(jobParams, context) {
    logger.warn(
      `The "/generate/csv" endpoint is deprecated. Please recreate the POST URL used to automate this CSV export.`
    );

    const { indexPatterns } = await reporting.getDataService();
    const dataViews = await indexPatterns.dataViewsServiceFactory(
      context.core.savedObjects.client,
      context.core.elasticsearch.client.asInternalUser
    );
    let dataView: DataView | undefined;

    try {
      dataView = await dataViews.get(jobParams.indexPatternId);
    } catch (error) {
      logger.error(`Failed to get the data view "${jobParams.indexPatternId}": ${error}`);
    }

    return {
      isDeprecated: true,
      indexPatternSavedObject: omitBy(
        {
          title: dataView?.title,
          timeFieldName: dataView?.timeFieldName,
          fields: dataView?.fields && [...dataView.fields.map((field) => field.toSpec())],
          fieldFormatMap: dataView?.fieldFormatMap,
        },
        isNil
      ),
      ...jobParams,
    };
  };
};
