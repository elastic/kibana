/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';

import { EuiDataGridColumn } from '@elastic/eui';

import {
  IndexPattern,
  ES_FIELD_TYPES,
} from '../../../../../../../../../../src/plugins/data/public';

import {
  useDataGrid,
  useRenderCellValue,
  UseIndexDataReturnType,
} from '../../../../../components/data_grid';
import { SavedSearchQuery } from '../../../../../contexts/ml';
import { newJobCapsService } from '../../../../../services/new_job_capabilities_service';

import {
  getDefaultFieldsFromJobCaps,
  getIndexData,
  DataFrameAnalyticsConfig,
} from '../../../../common';
import {
  sortRegressionResultsFields,
  BASIC_NUMERICAL_TYPES,
  EXTENDED_NUMERICAL_TYPES,
} from '../../../../common/fields';

const FEATURE_IMPORTANCE = 'feature_importance';

export const useRegressionData = (
  indexPattern: IndexPattern | undefined,
  jobConfig: DataFrameAnalyticsConfig | undefined,
  searchQuery: SavedSearchQuery
): UseIndexDataReturnType => {
  const needsDestIndexFields =
    indexPattern !== undefined && indexPattern.title === jobConfig?.source.index[0];

  const getDefaultSelectedFields = () => {
    const { fields } = newJobCapsService;
    if (jobConfig !== undefined) {
      const { selectedFields: defaultSelected, docFields } = getDefaultFieldsFromJobCaps(
        fields,
        jobConfig,
        needsDestIndexFields
      );

      const types: { [key: string]: ES_FIELD_TYPES } = {};
      const allFields: string[] = [];

      docFields.forEach(field => {
        types[field.id] = field.type;
        allFields.push(field.id);
      });

      return {
        defaultSelectedFields: defaultSelected.map(field => field.id),
        fieldTypes: types,
        tableFields: allFields,
      };
    } else {
      return {
        defaultSelectedFields: [],
        fieldTypes: {},
        tableFields: [],
      };
    }
  };

  let columns: EuiDataGridColumn[] = [];

  if (jobConfig !== undefined) {
    const resultsField = jobConfig.dest.results_field;
    const { fieldTypes, tableFields } = getDefaultSelectedFields();
    columns = tableFields
      .sort((a: any, b: any) => sortRegressionResultsFields(a, b, jobConfig))
      .map((field: any) => {
        // Built-in values are ['boolean', 'currency', 'datetime', 'numeric', 'json']
        // To fall back to the default string schema it needs to be undefined.
        let schema;
        let isSortable = true;
        const type = fieldTypes[field];
        const isNumber =
          type !== undefined &&
          (BASIC_NUMERICAL_TYPES.has(type) || EXTENDED_NUMERICAL_TYPES.has(type));

        if (isNumber) {
          schema = 'numeric';
        }

        switch (type) {
          case 'date':
            schema = 'datetime';
            break;
          case 'geo_point':
            schema = 'json';
            break;
          case 'boolean':
            schema = 'boolean';
            break;
        }

        if (field === `${resultsField}.${FEATURE_IMPORTANCE}`) {
          isSortable = false;
        }

        return { id: field, schema, isSortable };
      });
  }

  const dataGrid = useDataGrid(
    columns,
    25,
    // reduce default selected rows from 20 to 8 for performance reasons.
    8,
    // by default, hide feature-importance columns and the doc id copy
    d => !d.includes(`.${FEATURE_IMPORTANCE}.`) && d !== 'ml__id_copy'
  );

  useEffect(() => {
    getIndexData(jobConfig, dataGrid, searchQuery);
    // custom comparison
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobConfig && jobConfig.id, dataGrid.pagination, searchQuery, dataGrid.sortingColumns]);

  const renderCellValue = useRenderCellValue(
    indexPattern,
    dataGrid.pagination,
    dataGrid.tableItems
  );

  return {
    ...dataGrid,
    columns,
    renderCellValue,
  };
};
