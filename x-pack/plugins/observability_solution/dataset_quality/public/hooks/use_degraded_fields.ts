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
import {
  degradedFieldCauseFieldIgnored,
  degradedFieldCauseFieldIgnoredTooltip,
  degradedFieldCauseFieldLimitExceeded,
  degradedFieldCauseFieldLimitExceededTooltip,
  degradedFieldCauseFieldMalformed,
  degradedFieldCauseFieldMalformedTooltip,
} from '../../common/translations';

export type DegradedFieldSortField = keyof DegradedField;

export function useDegradedFields() {
  const { service } = useDatasetQualityDetailsState();
  const {
    services: { fieldFormats },
  } = useKibanaContextForPlugin();

  const { degradedFields, expandedDegradedField, showCurrentQualityIssues } = useSelector(
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

  const expandedRenderedItem = useMemo(() => {
    return renderedItems.find((item) => item.name === expandedDegradedField);
  }, [expandedDegradedField, renderedItems]);

  const isDegradedFieldsLoading = useSelector(service, (state) =>
    state.matches(
      'initializing.dataStreamSettings.loadingIntegrationsAndDegradedFields.dataStreamDegradedFields.fetching'
    )
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

  const toggleCurrentQualityIssues = useCallback(() => {
    service.send('TOGGLE_CURRENT_QUALITY_ISSUES');
  }, [service]);

  const degradedFieldValues = useSelector(service, (state) =>
    state.matches('initializing.degradedFieldFlyout.open.initialized.ignoredValues.done')
      ? state.context.degradedFieldValues
      : undefined
  );

  const degradedFieldAnalysis = useSelector(service, (state) =>
    state.matches('initializing.degradedFieldFlyout.open.initialized.mitigation.analyzed') ||
    state.matches('initializing.degradedFieldFlyout.open.initialized.mitigation.mitigating') ||
    state.matches(
      'initializing.degradedFieldFlyout.open.initialized.mitigation.askingForRollover'
    ) ||
    state.matches('initializing.degradedFieldFlyout.open.initialized.mitigation.rollingOver') ||
    state.matches('initializing.degradedFieldFlyout.open.initialized.mitigation.success') ||
    state.matches('initializing.degradedFieldFlyout.open.initialized.mitigation.error')
      ? state.context.degradedFieldAnalysis
      : undefined
  );

  const degradedFieldAnalysisFormattedResult = useMemo(() => {
    if (!degradedFieldAnalysis) {
      return undefined;
    }

    // 1st check if it's a field limit issue
    if (degradedFieldAnalysis.isFieldLimitIssue) {
      return {
        potentialCause: degradedFieldCauseFieldLimitExceeded,
        tooltipContent: degradedFieldCauseFieldLimitExceededTooltip,
        shouldDisplayIgnoredValuesAndLimit: false,
        identifiedUsingHeuristics: true,
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
          tooltipContent: degradedFieldCauseFieldIgnoredTooltip,
          shouldDisplayIgnoredValuesAndLimit: true,
          identifiedUsingHeuristics: true,
        };
      }
    }

    // 3rd check if its a ignore_malformed issue. There is no check, at the moment.
    return {
      potentialCause: degradedFieldCauseFieldMalformed,
      tooltipContent: degradedFieldCauseFieldMalformedTooltip,
      shouldDisplayIgnoredValuesAndLimit: false,
      identifiedUsingHeuristics: false, // TODO: Add heuristics to identify ignore_malformed issues
    };
  }, [degradedFieldAnalysis, degradedFieldValues]);

  const isDegradedFieldsValueLoading = useSelector(service, (state) => {
    return state.matches(
      'initializing.degradedFieldFlyout.open.initialized.ignoredValues.fetching'
    );
  });

  const isRolloverRequired = useSelector(service, (state) => {
    return state.matches(
      'initializing.degradedFieldFlyout.open.initialized.mitigation.askingForRollover'
    );
  });

  const isMitigationAppliedSuccessfully = useSelector(service, (state) => {
    return state.matches('initializing.degradedFieldFlyout.open.initialized.mitigation.success');
  });

  const isAnalysisInProgress = useSelector(service, (state) => {
    return state.matches('initializing.degradedFieldFlyout.open.initialized.mitigation.analyzing');
  });

  const isRolloverInProgress = useSelector(service, (state) => {
    return state.matches(
      'initializing.degradedFieldFlyout.open.initialized.mitigation.rollingOver'
    );
  });

  const updateNewFieldLimit = useCallback(
    (newFieldLimit: number) => {
      service.send({ type: 'SET_NEW_FIELD_LIMIT', newFieldLimit });
    },
    [service]
  );

  const isMitigationInProgress = useSelector(service, (state) => {
    return state.matches('initializing.degradedFieldFlyout.open.initialized.mitigation.mitigating');
  });

  const newFieldLimitData = useSelector(service, (state) =>
    state.matches('initializing.degradedFieldFlyout.open.initialized.mitigation.success') ||
    state.matches('initializing.degradedFieldFlyout.open.initialized.mitigation.error')
      ? state.context.fieldLimit
      : undefined
  );

  const triggerRollover = useCallback(() => {
    service.send('ROLLOVER_DATA_STREAM');
  }, [service]);

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
    degradedFieldAnalysisFormattedResult,
    toggleCurrentQualityIssues,
    showCurrentQualityIssues,
    expandedRenderedItem,
    updateNewFieldLimit,
    isMitigationInProgress,
    isRolloverInProgress,
    newFieldLimitData,
    isRolloverRequired,
    isMitigationAppliedSuccessfully,
    triggerRollover,
  };
}
