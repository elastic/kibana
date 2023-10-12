/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import {
  UnifiedFieldListSidebarContainer,
  type UnifiedFieldListSidebarContainerProps,
  type UnifiedFieldListSidebarContainerApi,
  FieldsGroupNames,
} from '@kbn/unified-field-list';
import type { CoreStart } from '@kbn/core/public';
import { useDispatch } from 'react-redux';
import type { ColumnHeaderOptions } from '../../../../../../common/types';
import { useKibana } from '../../../../../common/lib/kibana/kibana_react';

export enum FetchStatus {
  UNINITIALIZED = 'uninitialized',
  LOADING = 'loading',
  LOADING_MORE = 'loading_more',
  PARTIAL = 'partial',
  COMPLETE = 'complete',
  ERROR = 'error',
}

import {
  discoverSidebarReducer,
  getInitialState,
  DiscoverSidebarReducerActionType,
  DiscoverSidebarReducerStatus,
} from './lib/sidebar_reducer';
import { timelineActions } from '../../../../store/timeline';
import { getColumnHeader } from '../../body/column_headers/helpers';

const getCreationOptions: UnifiedFieldListSidebarContainerProps['getCreationOptions'] = () => {
  return {
    originatingApp: 'security_solution',
    localStorageKeyPrefix: 'security_solution',
    compressed: true,
    showSidebarToggleButton: true,
    disableFieldsExistenceAutoFetching: true,
    buttonAddFieldVariant: 'toolbar',
    buttonPropsToTriggerFlyout: {
      contentProps: {
        id: 'addFields',
      },
    },
    buttonAddFieldToWorkspaceProps: {
      'aria-label': i18n.translate('discover.fieldChooser.discoverField.addFieldTooltip', {
        defaultMessage: 'Add field as column',
      }),
    },
    buttonRemoveFieldFromWorkspaceProps: {
      'aria-label': i18n.translate('discover.fieldChooser.discoverField.removeFieldTooltip', {
        defaultMessage: 'Remove field from table',
      }),
    },
    onOverrideFieldGroupDetails: (groupName) => {
      if (groupName === FieldsGroupNames.AvailableFields) {
        return {
          helpText: i18n.translate('discover.fieldChooser.availableFieldsTooltip', {
            defaultMessage: 'Fields available for display in the table.',
          }),
        };
      }
    },
    dataTestSubj: {
      fieldListAddFieldButtonTestSubj: 'dataView-add-field_btn',
      fieldListSidebarDataTestSubj: 'discover-sidebar',
      fieldListItemStatsDataTestSubj: 'dscFieldStats',
      fieldListItemDndDataTestSubjPrefix: 'dscFieldListPanelField',
      fieldListItemPopoverDataTestSubj: 'discoverFieldListPanelPopover',
      fieldListItemPopoverHeaderDataTestSubjPrefix: 'discoverFieldListPanel',
    },
  };
};

export interface DiscoverSidebarResponsiveProps {
  /**
   * the selected columns displayed in the doc table in discover
   */
  columns: string[];
  /**
   * Callback function when selecting a field
   */
  onAddField: (fieldName: string) => void;
  /**
   * Callback function when adding a filter from sidebar
   */
  onAddFilter?: (field: DataViewField | string, value: unknown, type: '+' | '-') => void;
  /**
   * Callback to remove a field column from the table
   * @param fieldName
   */
  onRemoveField: (fieldName: string) => void;
  /**
   * Currently selected data view
   */
  selectedDataView?: DataView;
  /**
   * callback to execute on edit runtime field
   */
  onFieldEdited: (options?: { removedFieldName?: string }) => Promise<void>;
  /**
   * For customization and testing purposes
   */
  fieldListVariant?: UnifiedFieldListSidebarContainerProps['variant'];

  unifiedFieldListSidebarContainerApi: UnifiedFieldListSidebarContainerApi | null;
  setUnifiedFieldListSidebarContainerApi: (api: UnifiedFieldListSidebarContainerApi) => void;
  columnHeaders: ColumnHeaderOptions[];
  timelineId: string;
}

/**
 * Component providing 2 different renderings for the sidebar depending on available screen space
 * Desktop: Sidebar view, all elements are visible
 * Mobile: Data view selector is visible and a button to trigger a flyout with all elements
 */
export function TimelineSidebarResponsive(props: DiscoverSidebarResponsiveProps) {
  const dispatch = useDispatch();

  const {
    services: {
      uiSettings,
      fieldFormats,
      dataViews,
      dataViewFieldEditor,
      data: dataPluginContract,
      uiActions,
      charts,
      docLinks,
    },
  } = useKibana();
  const services: UnifiedFieldListSidebarContainerProps['services'] = useMemo(
    () => ({
      fieldFormats,
      dataViews,
      dataViewFieldEditor,
      data: dataPluginContract,
      uiActions,
      charts,
      core: {
        uiSettings,
        docLinks,
      } as CoreStart,
    }),
    [
      fieldFormats,
      dataViews,
      dataViewFieldEditor,
      dataPluginContract,
      uiActions,
      charts,
      uiSettings,
      docLinks,
    ]
  );
  const {
    fieldListVariant,
    selectedDataView,
    columns,
    onAddFilter,
    onFieldEdited,
    onAddField,
    onRemoveField,
    unifiedFieldListSidebarContainerApi,
    setUnifiedFieldListSidebarContainerApi,
    timelineId,
    columnHeaders,
  } = props;
  const [sidebarState, dispatchSidebarStateAction] = useReducer(
    discoverSidebarReducer,
    selectedDataView,
    getInitialState
  );
  const selectedDataViewRef = useRef<DataView | null | undefined>(selectedDataView);
  const showFieldList = sidebarState.status !== DiscoverSidebarReducerStatus.INITIAL;

  useEffect(() => {
    if (selectedDataView !== selectedDataViewRef.current) {
      dispatchSidebarStateAction({
        type: DiscoverSidebarReducerActionType.DATA_VIEW_SWITCHED,
        payload: {
          dataView: selectedDataView,
        },
      });
      selectedDataViewRef.current = selectedDataView;
    }
  }, [selectedDataView, dispatchSidebarStateAction, selectedDataViewRef]);

  // As unifiedFieldListSidebarContainerRef ref can be empty in the beginning,
  // we need to fetch the data once API becomes available and after documents are fetched
  const initializeUnifiedFieldListSidebarContainerApi = useCallback(
    (api) => {
      if (!api) {
        return;
      }

      if (scheduleFieldsExistenceInfoFetchRef.current) {
        scheduleFieldsExistenceInfoFetchRef.current = false;
        api.refetchFieldsExistenceInfo();
      }

      setUnifiedFieldListSidebarContainerApi(api);
    },
    [setUnifiedFieldListSidebarContainerApi, scheduleFieldsExistenceInfoFetchRef]
  );

  const fieldListSidebarServices: UnifiedFieldListSidebarContainerProps['services'] = useMemo(
    () => ({
      ...services,
    }),
    [services]
  );

  const onToggleColumn = useCallback(
    (columnId: string) => {
      dispatch(
        timelineActions.upsertColumn({
          column: getColumnHeader(columnId, columnHeaders),
          id: timelineId,
          index: 1,
        })
      );
    },
    [columnHeaders, dispatch, timelineId]
  );

  const onAddFieldToWorkspace = useCallback(
    (field: DataViewField) => {
      onAddField(field.name);
      onToggleColumn(field.name);
    },
    [onAddField, onToggleColumn]
  );

  const onRemoveFieldFromWorkspace = useCallback(
    (field: DataViewField) => {
      if (columns.includes(field.name)) {
        dispatch(
          timelineActions.removeColumn({
            columnId: field.name,
            id: timelineId,
          })
        );
      }
      onRemoveField(field.name);
    },
    [columns, dispatch, onRemoveField, timelineId]
  );

  if (!selectedDataView) {
    return null;
  }

  return (
    <UnifiedFieldListSidebarContainer
      ref={initializeUnifiedFieldListSidebarContainerApi}
      variant={fieldListVariant}
      getCreationOptions={getCreationOptions}
      services={fieldListSidebarServices}
      dataView={selectedDataView}
      allFields={sidebarState.allFields}
      showFieldList={showFieldList}
      workspaceSelectedFieldNames={columns}
      fullWidth
      onAddFieldToWorkspace={onAddFieldToWorkspace}
      onRemoveFieldFromWorkspace={onRemoveFieldFromWorkspace}
      onAddFilter={onAddFilter}
      onFieldEdited={onFieldEdited}
    />
  );
}
