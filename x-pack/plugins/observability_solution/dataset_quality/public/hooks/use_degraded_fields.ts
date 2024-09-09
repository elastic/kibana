/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useSelector } from '@xstate/react';
import { useCallback, useEffect, useMemo } from 'react';
import { orderBy } from 'lodash';
import { DegradedField } from '../../common/data_streams_stats';
import { SortDirection } from '../../common/types';
import {
  DEFAULT_DEGRADED_FIELD_SORT_DIRECTION,
  DEFAULT_DEGRADED_FIELD_SORT_FIELD,
} from '../../common/constants';
import { useKibanaContextForPlugin } from '../utils';
import { useDatasetQualityDetailsState } from './use_dataset_quality_details_state';
import {
  degradedFieldCauseFieldIgnored,
  degradedFieldCauseFieldLimitExceeded,
  degradedFieldCauseFieldMalformed,
} from '../../common/translations';

export type DegradedFieldSortField = keyof DegradedField;

export function useDegradedFields() {
  const { service } = useDatasetQualityDetailsState();
  const {
    services: { fieldFormats },
  } = useKibanaContextForPlugin();

  const { degradedFields, expandedDegradedField, isDegradedFieldFlyoutOpen } = useSelector(
    service,
    (state) => state.context
  );
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

  const hasDataStreamSettingsLoaded = useSelector(service, (state) =>
    state.matches('initializing.dataStreamSettings.initializeIntegrations')
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

  useEffect(() => {
    if (
      hasDataStreamSettingsLoaded &&
      expandedDegradedField &&
      !isDegradedFieldsLoading &&
      !isDegradedFieldFlyoutOpen
    ) {
      service.send({
        type: 'OPEN_DEGRADED_FIELD_FLYOUT',
        fieldName: expandedDegradedField,
      });
    }
  }, [
    isDegradedFieldsLoading,
    expandedDegradedField,
    service,
    isDegradedFieldFlyoutOpen,
    hasDataStreamSettingsLoaded,
  ]);

  const degradedFieldValues = useSelector(service, (state) =>
    state.matches('initializing.degradedFieldFlyout.initialized')
      ? state.context.degradedFieldValues
      : undefined
  );

  const degradedFieldAnalysis = useSelector(service, (state) =>
    state.matches('initializing.degradedFieldFlyout.initialized')
      ? state.context.degradedFieldAnalysis
      : undefined
  );

  // This piece only cater field limit issue at the moment.
  // In future this will cater the other 2 reasons as well
  const degradedFieldAnalysisResult = useMemo(() => {
    if (!degradedFieldAnalysis) {
      return undefined;
    }

    // 1st check if it's a field limit issue
    if (degradedFieldAnalysis.isFieldLimitIssue) {
      return {
        potentialCause: degradedFieldCauseFieldLimitExceeded,
        shouldDisplayMitigation: true,
        shouldDisplayValues: false,
      };
    }

    // 2nd check if it's a ignored above issue
    const fieldMapping = degradedFieldAnalysis.fieldMapping;

    if (fieldMapping && fieldMapping?.type === 'keyword' && fieldMapping?.ignore_above) {
      const isAnyValueExceedingIgnoreAbove = degradedFieldValues?.values.some(
        (value) => value.length > fieldMapping.ignore_above!
      );
      if (isAnyValueExceedingIgnoreAbove) {
        return {
          potentialCause: degradedFieldCauseFieldIgnored,
          shouldDisplayMitigation: false,
          shouldDisplayValues: true,
        };
      }
    }

    // 3rd check if its a ignore_malformed issue. There is no check, at the moment.
    return {
      potentialCause: degradedFieldCauseFieldMalformed,
      shouldDisplayMitigation: false,
      shouldDisplayValues: false,
    };
  }, [degradedFieldAnalysis, degradedFieldValues]);

  const isDegradedFieldsValueLoading = useSelector(service, (state) => {
    return state.matches('initializing.degradedFieldFlyout.initializing.ignoredValues.fetching');
  });

  const isAnalysisInProgress = useSelector(service, (state) => {
    return state.matches('initializing.degradedFieldFlyout.initializing.analyze.fetching');
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
    isAnalysisInProgress,
    degradedFieldAnalysis,
    degradedFieldAnalysisResult,
  };
}
