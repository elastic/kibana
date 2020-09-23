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
import { useIsMounted } from '../../../use_is_mounted';
import { Document } from '../../../types';

const UseField = getUseField({ component: Field });

const { emptyField } = fieldValidators;

const i18nTexts = {
  addDocumentButton: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.addDocuments.addDocumentButtonLabel',
    {
      defaultMessage: 'Add',
    }
  ),
  addDocumentErrorMessage: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.addDocuments.addDocumentErrorMessage',
    {
      defaultMessage: 'Error adding document',
    }
  ),
  addDocumentSuccessMessage: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.addDocuments.addDocumentSuccessMessage',
    {
      defaultMessage: 'Document added',
    }
  ),
  indexField: {
    fieldLabel: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.addDocuments.indexFieldLabel',
      {
        defaultMessage: 'Index',
      }
    ),
    validationMessage: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.addDocuments.indexRequiredErrorMessage',
      {
        defaultMessage: 'An index name is required.',
      }
    ),
  },
  idField: {
    fieldLabel: i18n.translate('xpack.ingestPipelines.pipelineEditor.addDocuments.idFieldLabel', {
      defaultMessage: 'Document ID',
    }),
    validationMessage: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.addDocuments.idRequiredErrorMessage',
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
  onAddDocuments: (document: Document) => void;
}

export const AddDocumentForm: FunctionComponent<Props> = ({ onAddDocuments }) => {
  const { services } = useKibana();
  const isMounted = useIsMounted();

  const [isLoadingDocument, setIsLoadingDocument] = useState<boolean>(false);
  const [documentError, setDocumentError] = useState<Error | undefined>(undefined);
  const [isDocumentAdded, setIsDocumentAdded] = useState<boolean>(false);

  const { form } = useForm({ defaultValue: { index: '', id: '' } });

  const submitForm = async (e: React.FormEvent) => {
    const { isValid, data } = await form.submit();

    const { id, index } = data;

    if (isValid) {
      setIsLoadingDocument(true);
      setDocumentError(undefined);
      setIsDocumentAdded(false);

      const { error, data: document } = await services.api.loadDocument(index, id);

      if (!isMounted.current) {
        return;
      }

      setIsLoadingDocument(false);

      if (error) {
        setDocumentError(error);
        return;
      }

      setIsDocumentAdded(true);
      onAddDocuments(document);
    }
  };

  return (
    <Form form={form} onSubmit={submitForm}>
      {documentError && (
        <>
          <EuiCallOut
            title={i18nTexts.addDocumentErrorMessage}
            color="danger"
            iconType="alert"
            data-test-subj="addDocumentError"
            size="s"
          >
            <p>{documentError.message}</p>
          </EuiCallOut>

          <EuiSpacer size="m" />
        </>
      )}

      {isDocumentAdded && (
        <>
          <EuiCallOut
            title={i18nTexts.addDocumentSuccessMessage}
            color="success"
            iconType="check"
            data-test-subj="addDocumentSuccess"
            size="s"
          />

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
                data-test-subj="addDocumentButton"
                isLoading={isLoadingDocument}
              >
                {i18nTexts.addDocumentButton}
              </EuiButton>
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </Form>
  );
};
