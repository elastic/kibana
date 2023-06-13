/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react/no-unused-prop-types*/

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { AggregateQuery, Query, TimeRange } from '@kbn/es-query';
import type { DiscoverStateContainer } from '@kbn/discover-plugin/public/application/main/services/discover_state';
import type { DataViewPickerProps } from '@kbn/unified-search-plugin/public';
import { useDiscoverCustomizationServiceForSecuritySolution } from '../../../../app/DiscoverCustomizationsProviders';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import type { QueryBarComponentProps } from '../../../../common/components/query_bar';
import { QueryBar } from '../../../../common/components/query_bar';
import { useKibana } from '../../../../common/lib/kibana';
import { useDiscoverFilterManager } from './use_discover_filter_manager';

interface Props {
  onOpenInspector: () => void;
  query?: Query | AggregateQuery;
  savedQuery?: string;
  updateQuery: (
    payload: { dateRange: TimeRange; query?: Query | AggregateQuery },
    isUpdate?: boolean
  ) => void;
  stateContainer: DiscoverStateContainer;
  isPlainRecord: boolean;
  textBasedLanguageModeErrors?: Error;
  onFieldEdited: () => Promise<void>;
  persistDataView: (dataView: DataView) => Promise<DataView | undefined>;
}

export const CustomDiscoverQueryBar = (props: Props) => {
  const { onFieldEdited, updateQuery, savedQuery } = props;
  const { discoverStateContainer } = useDiscoverCustomizationServiceForSecuritySolution();
  const {
    services: {
      uiSettings,
      dataViews: dataViewServices,
      dataViewEditor,
      dataViewFieldEditor,
      discoverFilterManager: filterManager,
    },
  } = useKibana();

  const { filters } = useDiscoverFilterManager(filterManager);

  const [appState, setAppState] = useState(() => discoverStateContainer?.appState.get());
  const [internalState, setInternalState] = useState(() =>
    discoverStateContainer?.internalState.get()
  );

  useEffect(() => {
    const appStateSub = discoverStateContainer?.appState.state$.subscribe({
      next: (newState) => {
        setAppState(newState);
      },
    });

    const internalStateSub = discoverStateContainer?.internalState.state$.subscribe({
      next: (newState) => {
        setInternalState(newState);
      },
    });

    return () => [appStateSub, internalStateSub].forEach((sub) => sub?.unsubscribe());
  }, [discoverStateContainer]);

  const canEditDataView =
    Boolean(dataViewEditor?.userPermissions.editDataView()) ||
    !internalState?.dataView?.isPersisted();

  const closeFieldEditor = useRef<() => void | undefined>();
  const closeDataViewEditor = useRef<() => void | undefined>();

  useEffect(() => {
    return () => {
      // Make sure to close the editors when unmounting
      if (closeFieldEditor.current) {
        closeFieldEditor.current();
      }
      if (closeDataViewEditor.current) {
        closeDataViewEditor.current();
      }
    };
  }, []);

  const editField = useMemo(
    () =>
      canEditDataView
        ? async (fieldName?: string, uiAction: 'edit' | 'add' = 'edit') => {
            if (appState?.index) {
              const dataViewInstance = await dataViewServices.get(appState?.index);
              closeFieldEditor.current = dataViewFieldEditor.openEditor({
                ctx: {
                  dataView: dataViewInstance,
                },
                fieldName,
                onSave: async () => {
                  await onFieldEdited();
                },
              });
            }
          }
        : undefined,
    [canEditDataView, appState?.index, dataViewServices, dataViewFieldEditor, onFieldEdited]
  );

  const addField = useMemo(
    () => (canEditDataView && editField ? () => editField(undefined, 'add') : undefined),
    [editField, canEditDataView]
  );

  const createNewDataView = useCallback(() => {
    closeDataViewEditor.current = dataViewEditor.openEditor({
      onSave: (dataViewId) => discoverStateContainer?.actions?.onDataViewCreated(dataViewId),
      allowAdHocDataView: true,
    });
  }, [dataViewEditor, discoverStateContainer]);

  const onEditDataView = async (editedDataView: DataView) => {
    if (editedDataView.isPersisted()) {
      // Clear the current data view from the cache and create a new instance
      // of it, ensuring we have a new object reference to trigger a re-render
      dataViewServices.clearInstanceCache(editedDataView.id);
      discoverStateContainer?.actions.setDataView(
        await dataViewServices.create(editedDataView.toSpec(), true)
      );
    } else {
      discoverStateContainer?.actions.updateAdHocDataViewId();
    }
    discoverStateContainer?.actions.loadDataViewList();
    discoverStateContainer?.dataState.fetch();
  };

  // const isSQLModeEnabled = uiSettings.get('discover:enableSQL');

  const supportedTextBasedLanguages = ['SQL'];

  // if (isSQLModeEnabled) {
  //   supportedTextBasedLanguages.push('SQL');
  // }
  //
  const onChangeDataView = useCallback(
    (newId: string) => {
      const fn = discoverStateContainer?.actions.onChangeDataView;
      if (fn) {
        fn(newId);
      }
    },
    [discoverStateContainer]
  );

  const dataViewPickerProps = {
    trigger: {
      label: internalState?.dataView?.getName() || '',
      'data-test-subj': 'security_solution-discover-customization-dataView-switch-link',
      title: internalState?.dataView?.getIndexPattern() || '',
    },
    currentDataViewId: internalState?.dataView?.id,
    onAddField: addField,
    onDataViewCreated: createNewDataView,
    onCreateDefaultAdHocDataView: discoverStateContainer?.actions.onCreateDefaultAdHocDataView,
    onChangeDataView,
    textBasedLanguages: supportedTextBasedLanguages as DataViewPickerProps['textBasedLanguages'],
    adHocDataViews: internalState?.adHocDataViews,
    savedDataViews: internalState?.savedDataViews,
    onEditDataView,
  };

  const { from, to } = useGlobalTime();

  const onQuerySubmit: QueryBarComponentProps['onSubmitQuery'] = useCallback(
    (query, timefilter) => {
      updateQuery({
        query,
        dateRange: {
          from: timefilter?.from ?? from,
          to: timefilter?.to ?? to,
          mode: timefilter?.mode ?? 'absolute',
        },
      });
    },
    [updateQuery, from, to]
  );

  const updateSavedQueryId = (newSavedQueryId: string | undefined) => {
    const { appState: localAppState } = discoverStateContainer as DiscoverStateContainer;
    if (newSavedQueryId) {
      localAppState.update({ savedQuery: newSavedQueryId });
    } else {
      // remove savedQueryId from state
      const newState = {
        ...localAppState.getState(),
      };
      delete newState.savedQuery;
      localAppState.set(newState);
    }
  };
  useEffect(() => {
    discoverStateContainer?.appState.update({ filters });
  }, [filters, discoverStateContainer?.appState]);

  if (!internalState || !internalState.dataView || !appState) return <p>{'Nothing'}</p>;

  return (
    <QueryBar
      dataViewPickerProps={dataViewPickerProps}
      onSubmitQuery={onQuerySubmit}
      dateRangeFrom={from}
      dateRangeTo={to}
      hideSavedQuery={false}
      indexPattern={internalState.dataView}
      isRefreshPaused={true}
      filterQuery={appState.query as Query}
      filterManager={filterManager}
      filters={filters}
      savedQueryId={savedQuery}
      onSavedQuery={updateSavedQueryId}
      dataTestSubj={'timelineQueryInput'}
      displayStyle="inPage"
      placeholder="Security Solution Custom Bar"
    />
  );
};
