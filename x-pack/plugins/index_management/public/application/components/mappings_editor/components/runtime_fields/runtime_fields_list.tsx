/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiButtonEmpty } from '@elastic/eui';

import { useMappingsState, useDispatch } from '../../mappings_state_context';
import {
  documentationService,
  GlobalFlyout,
  RuntimeField,
  RuntimeFieldEditorFlyoutContent,
  RuntimeFieldEditorFlyoutContentProps,
} from '../../shared_imports';
import { EmptyPrompt } from './empty_prompt';
import { RuntimeFieldsListItemContainer } from './runtimefields_list_item_container';

const { useGlobalFlyout } = GlobalFlyout;

export const RuntimeFieldsList = () => {
  const runtimeFieldsDocsUri = documentationService.getRuntimeFields();
  const {
    runtimeFields,
    runtimeFieldsList: { status, fieldToEdit },
  } = useMappingsState();
  const dispatch = useDispatch();
  const {
    addContent: addContentToGlobalFlyout,
    removeContent: removeContentFromGlobalFlyout,
  } = useGlobalFlyout();

  const createField = useCallback(() => {
    dispatch({ type: 'runtimeFieldsList.createField' });
  }, [dispatch]);

  const exitEdit = useCallback(() => {
    dispatch({ type: 'runtimeFieldsList.closeRuntimeFieldEditor' });
  }, [dispatch]);

  const saveRuntimeField = useCallback(
    (field: RuntimeField) => {
      if (fieldToEdit) {
        dispatch({
          type: 'runtimeField.edit',
          value: {
            id: fieldToEdit,
            source: field,
          },
        });
      } else {
        dispatch({ type: 'runtimeField.add', value: field });
      }
    },
    [dispatch, fieldToEdit]
  );

  useEffect(() => {
    if (status === 'creatingField' || status === 'editingField') {
      addContentToGlobalFlyout<RuntimeFieldEditorFlyoutContentProps>({
        id: 'runtimeFieldEditor',
        Component: RuntimeFieldEditorFlyoutContent,
        props: {
          onSave: saveRuntimeField,
          onCancel: exitEdit,
          defaultValue: fieldToEdit ? runtimeFields[fieldToEdit]?.source : undefined,
          docLinks: {
            DOC_LINK_VERSION: 'master',
            ELASTIC_WEBSITE_URL: 'https://elastic.co',
            links: {} as any,
          },
        },
        flyoutProps: {
          'data-test-subj': 'runtimeFieldEditor',
          'aria-labelledby': 'runtimeFieldEditorEditTitle',
          maxWidth: 720,
          onClose: exitEdit,
        },
        cleanUpFunc: exitEdit,
      });
    } else if (status === 'idle') {
      removeContentFromGlobalFlyout('runtimeFieldEditor');
    }
  }, [
    status,
    fieldToEdit,
    runtimeFields,
    addContentToGlobalFlyout,
    removeContentFromGlobalFlyout,
    saveRuntimeField,
    exitEdit,
  ]);

  const fieldsToArray = Object.entries(runtimeFields);
  const isEmpty = fieldsToArray.length === 0;
  const isCreateFieldDisabled = status !== 'idle';

  return isEmpty ? (
    <EmptyPrompt createField={createField} runtimeFieldsDocsUri={runtimeFieldsDocsUri} />
  ) : (
    <>
      <ul>
        {fieldsToArray.map(([fieldId]) => (
          <RuntimeFieldsListItemContainer key={fieldId} fieldId={fieldId} />
        ))}
      </ul>

      <EuiSpacer />

      <EuiButtonEmpty
        disabled={isCreateFieldDisabled}
        onClick={createField}
        iconType="plusInCircleFilled"
        data-test-subj="createRuntimeFieldButton"
      >
        {i18n.translate('xpack.idxMgmt.mappingsEditor.addRuntimeFieldButtonLabel', {
          defaultMessage: 'Add field',
        })}
      </EuiButtonEmpty>
    </>
  );
};
