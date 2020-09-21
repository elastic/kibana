/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFormRow,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiCallOut,
  EuiSpacer,
} from '@elastic/eui';

import {
  getUseField,
  Field,
  useKibana,
  useForm,
  Form,
  TextField,
  fieldValidators,
  FieldConfig,
} from '../../../../../../shared_imports';

const UseField = getUseField({ component: Field });

const { emptyField } = fieldValidators;

const i18nTexts = {
  importDocumentButton: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.loadDocuments.importDocButtonLabel',
    {
      defaultMessage: 'Import',
    }
  ),
  importDocumentErrorMessage: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.loadDocuments.importDocErrorMessage',
    {
      defaultMessage: 'Error importing document',
    }
  ),
  indexField: {
    fieldLabel: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.loadDocuments.table.indexColumnLabel',
      {
        defaultMessage: 'Index',
      }
    ),
    validationMessage: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.loadDocuments.indexRequiredError',
      {
        defaultMessage: 'An index name is required.',
      }
    ),
  },
  idField: {
    fieldLabel: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.loadDocuments.table.documentIdColumnLabel',
      {
        defaultMessage: 'Document ID',
      }
    ),
    validationMessage: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.loadDocuments.idRequiredError',
      {
        defaultMessage: 'A document ID is required.',
      }
    ),
  },
};

const fieldsConfig: Record<string, FieldConfig> = {
  index: {
    label: i18nTexts.indexField.fieldLabel,
    validations: [
      {
        validator: emptyField(i18nTexts.indexField.validationMessage),
      },
    ],
  },
  id: {
    label: i18nTexts.idField.fieldLabel,
    validations: [
      {
        validator: emptyField(i18nTexts.idField.validationMessage),
      },
    ],
  },
};

interface Props {
  onAddDocuments: (document: any) => void;
}

export const ImportDocumentForm: FunctionComponent<Props> = ({ onAddDocuments }) => {
  const { services } = useKibana();

  const [isLoadingDocument, setIsLoadingDocument] = useState<boolean>(false);
  const [loadingDocumentError, setLoadingDocumentError] = useState<Error | undefined>(undefined);

  const { form } = useForm({ defaultValue: { index: '', id: '' } });

  const submitForm = async (e: React.FormEvent) => {
    const { isValid, data } = await form.submit();

    const { id, index } = data;

    if (isValid) {
      setIsLoadingDocument(true);
      setLoadingDocumentError(undefined);

      const { error, data: document } = await services.api.loadDocument(index, id);

      setIsLoadingDocument(false);

      if (error) {
        setLoadingDocumentError(error);
        return;
      }

      onAddDocuments(document);
      form.reset();
    }
  };

  return (
    <Form form={form} onSubmit={submitForm}>
      {loadingDocumentError && (
        <>
          <EuiCallOut
            title={i18nTexts.importDocumentErrorMessage}
            color="danger"
            iconType="alert"
            data-test-subj="importDocumentError"
          >
            <p>{loadingDocumentError.message}</p>
          </EuiCallOut>

          <EuiSpacer size="m" />
        </>
      )}

      <EuiPanel paddingSize="m">
        <EuiFlexGroup>
          <EuiFlexItem>
            <UseField
              path="index"
              component={TextField}
              config={fieldsConfig.index}
              componentProps={{
                ['data-test-subj']: 'indexField',
              }}
            />
          </EuiFlexItem>

          <EuiFlexItem>
            <UseField
              path="id"
              component={TextField}
              config={fieldsConfig.id}
              componentProps={{
                ['data-test-subj']: 'idField',
              }}
            />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiFormRow hasEmptyLabelSpace>
              <EuiButton
                onClick={submitForm}
                data-test-subj="importDocumentButton"
                isLoading={isLoadingDocument}
              >
                {i18nTexts.importDocumentButton}
              </EuiButton>
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </Form>
  );
};
