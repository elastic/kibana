/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewPicker } from '@kbn/unified-search-plugin/public';
import React, { useCallback, useRef, useMemo, memo } from 'react';

import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import { selectDataView } from '../../redux/actions';
import { useDispatch, useSelector } from '../../redux/hooks';
import { sourcererAdapterSelector } from '../../redux/selectors';

const TRIGGER_CONFIG = {
  label: 'Dataview',
  color: 'danger',
  title: 'Experimental data view picker',
  iconType: 'beaker',
} as const;

export const DataviewPicker = memo(() => {
  const dispatch = useDispatch();

  const {
    services: { dataViewEditor, data, dataViewFieldEditor },
  } = useKibana();

  const closeDataViewEditor = useRef<() => void | undefined>();
  const closeFieldEditor = useRef<() => void | undefined>();

  // TODO: should this be implemented like that?
  // const canEditDataView =
  // Boolean(dataViewEditor?.userPermissions.editDataView()) || !dataView.isPersisted();
  const canEditDataView = true;

  const { dataViewId } = useSelector(sourcererAdapterSelector);

  const createNewDataView = useCallback(() => {
    closeDataViewEditor.current = dataViewEditor.openEditor({
      // eslint-disable-next-line no-console
      onSave: () => console.log('new data view saved'),
      allowAdHocDataView: true,
    });
  }, [dataViewEditor]);

  const onFieldEdited = useCallback(() => {}, []);

  const editField = useMemo(
    () =>
      canEditDataView
        ? async (fieldName?: string, uiAction: 'edit' | 'add' = 'edit') => {
            if (dataViewId) {
              const dataViewInstance = await data.dataViews.get(dataViewId);
              closeFieldEditor.current = dataViewFieldEditor.openEditor({
                ctx: {
                  dataView: dataViewInstance,
                },
                fieldName,
                onSave: async () => {
                  onFieldEdited();
                },
              });
            }
          }
        : undefined,
    [canEditDataView, dataViewId, data.dataViews, dataViewFieldEditor, onFieldEdited]
  );

  const addField = useMemo(
    () => (canEditDataView && editField ? () => editField(undefined, 'add') : undefined),
    [editField, canEditDataView]
  );

  const handleChangeDataView = useCallback(
    (id: string) => {
      dispatch(selectDataView(id));
    },
    [dispatch]
  );

  const handleEditDataView = useCallback(() => {}, []);

  return (
    <DataViewPicker
      currentDataViewId={dataViewId || undefined}
      trigger={TRIGGER_CONFIG}
      onChangeDataView={handleChangeDataView}
      onEditDataView={handleEditDataView}
      onAddField={addField}
      onDataViewCreated={createNewDataView}
    />
  );
});

DataviewPicker.displayName = 'DataviewPicker';
