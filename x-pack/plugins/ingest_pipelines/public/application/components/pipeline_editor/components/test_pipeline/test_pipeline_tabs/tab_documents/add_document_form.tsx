/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCallOut,
  EuiSpacer,
  EuiText,
  EuiIcon,
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
} from '../../../../../../../shared_imports';
import { useIsMounted } from '../../../../use_is_mounted';
import { Document } from '../../../../types';

const UseField = getUseField({ component: Field });

const { emptyField } = fieldValidators;

const i18nTexts = {
  addDocumentButton: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.addDocuments.addDocumentButtonLabel',
    {
      defaultMessage: 'Add document',
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

      <UseField
        path="index"
        component={TextField}
        config={fieldsConfig.index}
        componentProps={{
          ['data-test-subj']: 'indexField',
        }}
      />

      <UseField
        path="id"
        component={TextField}
        config={fieldsConfig.id}
        componentProps={{
          ['data-test-subj']: 'idField',
        }}
      />

      <EuiSpacer />

      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiButton
            onClick={submitForm}
            data-test-subj="addDocumentButton"
            isLoading={isLoadingDocument}
          >
            {i18nTexts.addDocumentButton}
          </EuiButton>
        </EuiFlexItem>

        {isDocumentAdded && (
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiIcon type="check" color="success" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText color="success" data-test-subj="addDocumentSuccess">
                  {i18nTexts.addDocumentSuccessMessage}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </Form>
  );
};
