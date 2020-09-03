/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import { EuiSpacer, EuiText, EuiButton, EuiLink } from '@elastic/eui';

import {
  getUseField,
  Field,
  JsonEditorField,
  Form,
  useForm,
  useKibana,
} from '../../../../../../shared_imports';

import { TestPipelineContext } from '../../../context';
import { Document } from '../../../types';
import { DeserializeResult } from '../../../deserialize';
import { HandleTestPipelineArgs } from '../test_pipeline_flyout';
import { documentsSchema } from './documents_schema';

const UseField = getUseField({ component: Field });

interface Props {
  handleTestPipeline: (data: HandleTestPipelineArgs) => void;
  setPerProcessorOutput: (documents: Document[] | undefined, processors: DeserializeResult) => void;
  isRunningTest: boolean;
  processors: DeserializeResult;
  testPipelineData: TestPipelineContext['testPipelineData'];
}

export const DocumentsTab: React.FunctionComponent<Props> = ({
  handleTestPipeline,
  isRunningTest,
  setPerProcessorOutput,
  processors,
  testPipelineData,
}) => {
  const { services } = useKibana();

  const {
    config: { documents: cachedDocuments, verbose: cachedVerbose },
  } = testPipelineData;

  const testPipeline = async () => {
    const { isValid, data } = await form.submit();

    if (!isValid) {
      return;
    }

    const { documents } = data as { documents: Document[] };

    await handleTestPipeline({ documents: documents!, verbose: cachedVerbose });

    // This is necessary to update the status and output of each processor
    // as verbose may not be enabled
    setPerProcessorOutput(documents, processors);
  };

  const { form } = useForm({
    schema: documentsSchema,
    defaultValue: {
      documents: cachedDocuments || '',
    },
  });

  return (
    <div data-test-subj="documentsTabContent">
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.ingestPipelines.testPipelineFlyout.documentsTab.tabDescriptionText"
            defaultMessage="Provide an array of documents for the pipeline to ingest. {learnMoreLink}"
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

      <Form
        form={form}
        data-test-subj="testPipelineForm"
        isInvalid={form.isSubmitted && !form.isValid}
        onSubmit={testPipeline}
        error={form.getErrors()}
      >
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
          data-test-subj="runPipelineButton"
          onClick={testPipeline}
          size="s"
          isLoading={isRunningTest}
          disabled={form.isSubmitted && !form.isValid}
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
      </Form>
    </div>
  );
};
