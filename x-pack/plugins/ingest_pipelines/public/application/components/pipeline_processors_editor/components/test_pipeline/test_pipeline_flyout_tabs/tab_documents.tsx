/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import { EuiSpacer, EuiText, EuiButton, EuiLink } from '@elastic/eui';

import {
  getUseField,
  Field,
  JsonEditorField,
  useKibana,
  useFormData,
  FormHook,
  Form,
} from '../../../../../../shared_imports';

import { ImportDocumentsAccordion } from './import_documents_accordion';

const UseField = getUseField({ component: Field });

interface Props {
  validateAndTestPipeline: () => Promise<void>;
  isRunningTest: boolean;
  form: FormHook;
}

export const DocumentsTab: FunctionComponent<Props> = ({
  validateAndTestPipeline,
  isRunningTest,
  form,
}) => {
  const { services } = useKibana();

  const [, formatData] = useFormData({ form });

  const onAddDocumentHandler = useCallback(
    (document) => {
      const { documents: existingDocuments } = formatData();

      form.reset({ defaultValue: { documents: [...existingDocuments, document] } });
    },
    [form, formatData]
  );

  return (
    <Form
      form={form}
      data-test-subj="testPipelineForm"
      isInvalid={form.isSubmitted && !form.isValid}
      onSubmit={validateAndTestPipeline}
      error={form.getErrors()}
    >
      <div data-test-subj="documentsTabContent">
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.ingestPipelines.testPipelineFlyout.documentsTab.tabDescriptionText"
              defaultMessage="Provide documents for the pipeline to ingest. {learnMoreLink}"
              values={{
                learnMoreLink: (
                  <EuiLink
                    href={`${services.documentation.getEsDocsBasePath()}/simulate-pipeline-api.html`}
                    target="_blank"
                    external
                  >
                    {i18n.translate(
                      'xpack.ingestPipelines.testPipelineFlyout.documentsTab.simulateDocumentionLink',
                      {
                        defaultMessage: 'Learn more.',
                      }
                    )}
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiText>

        <EuiSpacer size="m" />

        <ImportDocumentsAccordion onAddDocuments={onAddDocumentHandler} />

        <EuiSpacer size="l" />

        {/* Documents editor */}
        <UseField
          path="documents"
          component={JsonEditorField}
          componentProps={{
            euiCodeEditorProps: {
              'data-test-subj': 'documentsEditor',
              height: '300px',
              'aria-label': i18n.translate(
                'xpack.ingestPipelines.testPipelineFlyout.documentsTab.editorFieldAriaLabel',
                {
                  defaultMessage: 'Documents JSON editor',
                }
              ),
            },
          }}
        />

        <EuiSpacer size="m" />

        <EuiButton
          onClick={validateAndTestPipeline}
          data-test-subj="runPipelineButton"
          size="s"
          isLoading={isRunningTest}
          disabled={form.isSubmitted && !form.isValid}
          iconType="play"
        >
          {isRunningTest ? (
            <FormattedMessage
              id="xpack.ingestPipelines.testPipelineFlyout.documentsTab.runningButtonLabel"
              defaultMessage="Running"
            />
          ) : (
            <FormattedMessage
              id="xpack.ingestPipelines.testPipelineFlyout.documentsTab.runButtonLabel"
              defaultMessage="Run the pipeline"
            />
          )}
        </EuiButton>
      </div>
    </Form>
  );
};
