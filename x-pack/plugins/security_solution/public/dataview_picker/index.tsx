/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewPicker } from '@kbn/unified-search-plugin/public';
import React, { useCallback, useRef, useMemo } from 'react';

import { useKibana } from '../common/lib/kibana/kibana_react';

// FIXME: remove this later
/* eslint-disable no-console */

// NOTE: starting with the single file with the intention to break it up into relavant parts later

// NOTE: for reference on how this is used
// src/plugins/discover/public/application/main/components/top_nav/discover_topnav.tsx

// NOTE:actual implementation of the picker
// src/plugins/unified_search/public/dataview_picker/change_dataview.tsx

// NOTE: useSourcererDataView
// x-pack/plugins/security_solution/public/common/containers/sourcerer/index.tsx

export const DataviewPicker = () => {
  const {
    services: { dataViewEditor, data, dataViewFieldEditor },
  } = useKibana();

  const closeDataViewEditor = useRef<() => void | undefined>();
  const closeFieldEditor = useRef<() => void | undefined>();

  // const canEditDataView =
  // Boolean(dataViewEditor?.userPermissions.editDataView()) || !dataView.isPersisted();
  const canEditDataView = true;

  const dataView = { id: 'security-solution-default' };

  const createNewDataView = useCallback(() => {
    closeDataViewEditor.current = dataViewEditor.openEditor({
      onSave: () => console.log('new data view saved'),
      allowAdHocDataView: true,
    });
  }, [dataViewEditor]);

  const onFieldEdited = useCallback(() => {}, []);

  const editField = useMemo(
    () =>
      canEditDataView
        ? async (fieldName?: string, uiAction: 'edit' | 'add' = 'edit') => {
            if (dataView?.id) {
              const dataViewInstance = await data.dataViews.get(dataView.id);
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
    [canEditDataView, dataView?.id, data.dataViews, dataViewFieldEditor, onFieldEdited]
  );

  const addField = useMemo(
    () => (canEditDataView && editField ? () => editField(undefined, 'add') : undefined),
    [editField, canEditDataView]
  );

  return (
    <>
      <DataViewPicker
        currentDataViewId={dataView.id}
        trigger={{
          label: 'Sourcerer PRO',
        }}
        onChangeDataView={(dataViewId) => console.log('data view changed', dataViewId)}
        onEditDataView={() => {
          console.info('data view edited');
        }}
        onAddField={addField}
        onDataViewCreated={createNewDataView}
      />
    </>
  );
};
