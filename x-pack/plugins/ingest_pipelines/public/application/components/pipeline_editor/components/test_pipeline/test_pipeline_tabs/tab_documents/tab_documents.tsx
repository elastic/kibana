/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useCallback, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { EuiSpacer, EuiText, EuiButton, EuiLink, EuiCode, EuiButtonEmpty } from '@elastic/eui';

import { parseJson, stringifyJson } from '../../../../../../lib';
import {
  getUseField,
  Field,
  JsonEditorField,
  useKibana,
  FieldConfig,
  fieldValidators,
  ValidationFuncArg,
  FormHook,
  Form,
} from '../../../../../../../shared_imports';
import { Document } from '../../../../types';
import { AddDocumentsAccordion } from './add_docs_accordion';
import { ResetDocumentsModal } from './reset_documents_modal';

import './tab_documents.scss';

const UseField = getUseField({ component: Field });

const { emptyField, isJsonField } = fieldValidators;

interface Props {
  validateAndTestPipeline: () => Promise<void>;
  resetTestOutput: () => void;
  isRunningTest: boolean;
  form: FormHook<{
    documents: string | Document[];
  }>;
}

const i18nTexts = {
  learnMoreLink: i18n.translate(
    'xpack.ingestPipelines.testPipelineFlyout.documentsTab.simulateDocumentionLink',
    {
      defaultMessage: 'Learn more.',
    }
  ),
  documentsEditorAriaLabel: i18n.translate(
    'xpack.ingestPipelines.testPipelineFlyout.documentsTab.editorFieldAriaLabel',
    {
      defaultMessage: 'Documents JSON editor',
    }
  ),
  documentsEditorClearAllButton: i18n.translate(
    'xpack.ingestPipelines.testPipelineFlyout.documentsTab.editorFieldClearAllButtonLabel',
    {
      defaultMessage: 'Clear all',
    }
  ),
  runButton: i18n.translate(
    'xpack.ingestPipelines.testPipelineFlyout.documentsTab.runButtonLabel',
    {
      defaultMessage: 'Run the pipeline',
    }
  ),
  runningButton: i18n.translate(
    'xpack.ingestPipelines.testPipelineFlyout.documentsTab.runningButtonLabel',
    {
      defaultMessage: 'Running',
    }
  ),
};

const documentFieldConfig: FieldConfig<object[], {}, string> = {
  label: i18n.translate(
    'xpack.ingestPipelines.testPipelineFlyout.documentsForm.documentsFieldLabel',
    {
      defaultMessage: 'Documents',
    }
  ),
  helpText: (
    <FormattedMessage
      id="xpack.ingestPipelines.form.onFailureFieldHelpText"
      defaultMessage="Use JSON format: {code}"
      values={{
        code: (
          <EuiCode>
            {JSON.stringify([
              {
                _index: 'index',
                _id: 'id',
                _source: {
                  foo: 'bar',
                },
              },
            ])}
          </EuiCode>
        ),
      }}
    />
  ),
  serializer: parseJson,
  deserializer: stringifyJson,
  validations: [
    {
      validator: emptyField(
        i18n.translate('xpack.ingestPipelines.testPipelineFlyout.documentsForm.noDocumentsError', {
          defaultMessage: 'Documents are required.',
        })
      ),
    },
    {
      validator: isJsonField(
        i18n.translate(
          'xpack.ingestPipelines.testPipelineFlyout.documentsForm.documentsJsonError',
          {
            defaultMessage: 'The documents JSON is not valid.',
          }
        )
      ),
    },
    {
      validator: ({ value }: ValidationFuncArg<any, any>) => {
        const parsedJSON = JSON.parse(value);

        if (!parsedJSON.length) {
          return {
            message: i18n.translate(
              'xpack.ingestPipelines.testPipelineFlyout.documentsForm.oneDocumentRequiredError',
              {
                defaultMessage: 'At least one document is required.',
              }
            ),
          };
        }
      },
    },
  ],
};

export const DocumentsTab: FunctionComponent<Props> = ({
  validateAndTestPipeline,
  isRunningTest,
  form,
  resetTestOutput,
}) => {
  const { services } = useKibana();
  const { getFormData, reset } = form;

  const onAddDocumentHandler = useCallback(
    (document) => {
      const { documents: existingDocuments = [] } = getFormData();

      reset({ defaultValue: { documents: [...existingDocuments, document] } });
    },
    [reset, getFormData]
  );

  const [showResetModal, setShowResetModal] = useState<boolean>(false);

  return (
    <Form
      form={form}
      data-test-subj="testPipelineForm"
      isInvalid={form.isSubmitted && !form.isValid}
      onSubmit={validateAndTestPipeline}
      error={form.getErrors()}
    >
      <div data-test-subj="documentsTabContent" className="documentsTab">
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.ingestPipelines.testPipelineFlyout.documentsTab.tabDescriptionText"
              defaultMessage="Provide documents for the pipeline to ingest. {learnMoreLink}"
              values={{
                learnMoreLink: (
                  <EuiLink
                    href={services.documentation.getSimulatePipelineApiUrl()}
                    target="_blank"
                    external
                  >
                    {i18nTexts.learnMoreLink}
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiText>

        <EuiSpacer size="m" />

        <AddDocumentsAccordion onAddDocuments={onAddDocumentHandler} />

        <EuiSpacer size="l" />

        {/* Documents editor */}
        <UseField config={documentFieldConfig} path="documents">
          {(field) => (
            <div className="documentsTab__documentField">
              <EuiButtonEmpty
                size="xs"
                onClick={() => setShowResetModal(true)}
                data-test-subj="clearAllDocumentsButton"
                className="documentsTab__documentField__button"
              >
                {i18nTexts.documentsEditorClearAllButton}
              </EuiButtonEmpty>
              <JsonEditorField
                field={field}
                euiCodeEditorProps={{
                  'data-test-subj': 'documentsEditor',
                  height: '300px',
                  'aria-label': i18nTexts.documentsEditorAriaLabel,
                }}
              />
            </div>
          )}
        </UseField>

        <EuiSpacer size="m" />

        <EuiButton
          onClick={validateAndTestPipeline}
          data-test-subj="runPipelineButton"
          size="s"
          isLoading={isRunningTest}
          disabled={form.isSubmitted && !form.isValid}
          iconType="play"
        >
          {isRunningTest ? i18nTexts.runningButton : i18nTexts.runButton}
        </EuiButton>

        {showResetModal && (
          <ResetDocumentsModal
            confirmResetTestOutput={() => {
              resetTestOutput();
              form.reset({ defaultValue: { documents: [] } });
              setShowResetModal(false);
            }}
            closeModal={() => setShowResetModal(false)}
          />
        )}
      </div>
    </Form>
  );
};
