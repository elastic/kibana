/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { DataView } from '@kbn/data-plugin/common';
import { DATA_VIEW_INDEX_PATTERN } from '../../../common/constants';
import { CspClientPluginStartDeps } from '../../types';

/**
 *  Returns the common logs-* data view with fields filtered by
 *  the given index pattern
 */
export const useDataViewForIndexPattern = (indexPattern: string) => {
  const {
    data: { dataViews },
  } = useKibana<CspClientPluginStartDeps>().services;

  const findDataView = async (): Promise<DataView> => {
    const dataView = (await dataViews.find(DATA_VIEW_INDEX_PATTERN))?.[0];
    if (!dataView) {
      throw new Error('Findings data view not found');
    }

    const indexPatternFields = (await dataViews.getFieldsForWildcard({
      pattern: indexPattern,
    })) as DataView['fields'];

    if (!indexPatternFields) {
      throw new Error('Error fetching fields for the index pattern');
    }

    dataView.fields = indexPatternFields;

    return dataView;
  };

  return useQuery(['latest_findings_data_view', indexPattern], findDataView);
};
