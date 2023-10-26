/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useEffect, useRef } from 'react';
import { useMlKibana } from '../../contexts/kibana';

export const CreateDataViewButton = ({
  onDataViewCreated,
  allowAdHocDataView = false,
}: {
  onDataViewCreated: (id: string, type: string, name?: string) => void;
  allowAdHocDataView?: boolean;
}) => {
  const { dataViewEditor } = useMlKibana().services;
  const canEditDataView = Boolean(dataViewEditor?.userPermissions.editDataView());
  const closeDataViewEditorRef = useRef<() => void | undefined>();

  const createNewDataView = useCallback(() => {
    closeDataViewEditorRef.current = dataViewEditor?.openEditor({
      onSave: async (dataView) => {
        if (dataView.id && onDataViewCreated) {
          onDataViewCreated(dataView.id, 'index-pattern', dataView.name);
        }
      },

      allowAdHocDataView,
    });
  }, [onDataViewCreated, dataViewEditor, allowAdHocDataView]);

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
