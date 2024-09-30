/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useSelector } from '@xstate/react';
import { useCallback, useMemo } from 'react';
import { orderBy } from 'lodash';
import { DegradedField } from '../../common/data_streams_stats';
import { SortDirection } from '../../common/types';
import {
  DEFAULT_DEGRADED_FIELD_SORT_DIRECTION,
  DEFAULT_DEGRADED_FIELD_SORT_FIELD,
} from '../../common/constants';
import { useKibanaContextForPlugin } from '../utils';
import { useDatasetQualityDetailsState } from './use_dataset_quality_details_state';

export type DegradedFieldSortField = keyof DegradedField;

export function useDegradedFields() {
  const { service } = useDatasetQualityDetailsState();
  const {
    services: { fieldFormats },
  } = useKibanaContextForPlugin();

  const { degradedFields, expandedDegradedField } = useSelector(service, (state) => state.context);
  const { data, table } = degradedFields ?? {};
  const { page, rowsPerPage, sort } = table;

  const totalItemCount = data?.length ?? 0;

  const pagination = {
    pageIndex: page,
    pageSize: rowsPerPage,
    totalItemCount,
    hidePerPageOptions: true,
  };

  const onTableChange = useCallback(
    (options: {
      page: { index: number; size: number };
      sort?: { field: DegradedFieldSortField; direction: SortDirection };
    }) => {
      service.send({
        type: 'UPDATE_DEGRADED_FIELDS_TABLE_CRITERIA',
        degraded_field_criteria: {
          page: options.page.index,
          rowsPerPage: options.page.size,
          sort: {
            field: options.sort?.field || DEFAULT_DEGRADED_FIELD_SORT_FIELD,
            direction: options.sort?.direction || DEFAULT_DEGRADED_FIELD_SORT_DIRECTION,
          },
        },
      });
    },
    [service]
  );

  const renderedItems = useMemo(() => {
    const sortedItems = orderBy(data, sort.field, sort.direction);
    return sortedItems.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  }, [data, sort.field, sort.direction, page, rowsPerPage]);

  const isDegradedFieldsLoading = useSelector(service, (state) =>
    state.matches('initializing.dataStreamDegradedFields.fetching')
  );

  const closeDegradedFieldFlyout = useCallback(
    () => service.send({ type: 'CLOSE_DEGRADED_FIELD_FLYOUT' }),
    [service]
  );

  const openDegradedFieldFlyout = useCallback(
    (fieldName: string) => {
      if (expandedDegradedField === fieldName) {
        service.send({ type: 'CLOSE_DEGRADED_FIELD_FLYOUT' });
      } else {
        service.send({ type: 'OPEN_DEGRADED_FIELD_FLYOUT', fieldName });
      }
    },
    [expandedDegradedField, service]
  );

  const degradedFieldValues = useSelector(service, (state) =>
    state.matches('initializing.initializeFixItFlow.ignoredValues.done')
      ? state.context.degradedFieldValues
      : undefined
  );

  const isDegradedFieldsValueLoading = useSelector(service, (state) => {
    return !state.matches('initializing.initializeFixItFlow.ignoredValues.done');
  });

  return {
    isDegradedFieldsLoading,
    pagination,
    onTableChange,
    renderedItems,
    sort: { sort },
    fieldFormats,
    totalItemCount,
    expandedDegradedField,
    openDegradedFieldFlyout,
    closeDegradedFieldFlyout,
    degradedFieldValues,
    isDegradedFieldsValueLoading,
  };
}
