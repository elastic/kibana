/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useEffect, useRef } from 'react';
import { type DataView } from '@kbn/data-plugin/common';
import { useMlKibana } from '../../contexts/kibana';

export const CreateDataViewButton = ({
  onDataViewCreated,
  allowAdHocDataView = false,
}: {
  onDataViewCreated: (dataView: DataView) => void;
  allowAdHocDataView?: boolean;
}) => {
  const { dataViewEditor, dataViews } = useMlKibana().services;
  const canEditDataView = Boolean(dataViewEditor?.userPermissions.editDataView());
  const closeDataViewEditorRef = useRef<() => void | undefined>();

  const createNewDataView = useCallback(() => {
    closeDataViewEditorRef.current = dataViewEditor?.openEditor({
      onSave: async (dataViewLazy) => {
        if (dataViewLazy.id && onDataViewCreated) {
          dataViews.toDataView(dataViewLazy).then(onDataViewCreated);
        }
      },
      allowAdHocDataView,
    });
  }, [onDataViewCreated, dataViewEditor, allowAdHocDataView, dataViews]);

  useEffect(function cleanUpFlyout() {
    return () => {
      // Close the editor when unmounting
      if (closeDataViewEditorRef.current) {
        closeDataViewEditorRef.current();
      }
    };
  }, []);

  return canEditDataView ? (
    <EuiButton
      onClick={createNewDataView}
      fill
      iconType="plusInCircle"
      data-test-subj="newDataViewButton"
      disabled={!canEditDataView}
    >
      <FormattedMessage
        id="xpack.ml.savedObjectFinder.createADataView"
        defaultMessage="Create a data view"
      />
    </EuiButton>
  ) : null;
};
