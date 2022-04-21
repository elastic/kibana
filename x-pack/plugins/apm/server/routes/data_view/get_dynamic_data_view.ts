/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndexPatternsFetcher, FieldDescriptor } from '@kbn/data-plugin/server';
import { APMRouteHandlerResources } from '../typings';
import { withApmSpan } from '../../utils/with_apm_span';
import { getApmIndices } from '../settings/apm_indices/get_apm_indices';
import { getApmDataViewTitle } from './get_apm_data_view_title';

export interface DataViewTitleAndFields {
  title: string;
  timeFieldName: string;
  fields: FieldDescriptor[];
}

export const getDynamicDataView = ({
  config,
  context,
  logger,
}: Pick<APMRouteHandlerResources, 'logger' | 'config' | 'context'>) => {
  return withApmSpan('get_dynamic_data_view', async () => {
    const apmIndicies = await getApmIndices({
      savedObjectsClient: context.core.savedObjects.client,
      config,
    });
    const dataViewTitle = getApmDataViewTitle(apmIndicies);

    const DataViewsFetcher = new IndexPatternsFetcher(
      context.core.elasticsearch.client.asCurrentUser
    );

    // Since `getDynamicDataView` is called in setup_request (and thus by every endpoint)
    // and since `getFieldsForWildcard` will throw if the specified indices don't exist,
    // we have to catch errors here to avoid all endpoints returning 500 for users without APM data
    // (would be a bad first time experience)
    try {
      const fields = await DataViewsFetcher.getFieldsForWildcard({
        pattern: dataViewTitle,
      });

      const dataView: DataViewTitleAndFields = {
        fields,
        timeFieldName: '@timestamp',
        title: dataViewTitle,
      };

      return dataView;
    } catch (e) {
      const notExists = e.output?.statusCode === 404;
      if (notExists) {
        logger.error(
          `Could not get dynamic data view because indices "${dataViewTitle}" don't exist`
        );
        return;
      }

      // re-throw
      throw e;
    }
  });
};
