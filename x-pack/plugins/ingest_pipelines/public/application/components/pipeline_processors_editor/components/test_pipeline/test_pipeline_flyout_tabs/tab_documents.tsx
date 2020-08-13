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
} from '../../../../../../shared_imports';

import { usePipelineProcessorsContext, useTestPipelineContext } from '../../../context';
import { Document } from '../../../types';

import { documentsSchema } from './documents_schema';
import { HandleExecuteArgs } from '../test_pipeline_flyout';

const UseField = getUseField({ component: Field });

interface Props {
  handleExecute: (data: HandleExecuteArgs) => void;
  setPerProcessorOutput: (documents: Document[]) => void;
  isExecuting: boolean;
}

export const DocumentsTab: React.FunctionComponent<Props> = ({
  handleExecute,
  isExecuting,
  setPerProcessorOutput,
}) => {
  const { links } = usePipelineProcessorsContext();

  const { testPipelineData } = useTestPipelineContext();

  const {
    config: { documents: cachedDocuments },
  } = testPipelineData;

  const executePipeline = async () => {
    const { isValid, data } = await form.submit();

    if (!isValid) {
      return;
    }

    const { documents } = data as { documents: Document[] };

    await handleExecute({ documents: documents! });

    // This is necessary to update the status and output of each processor
    setPerProcessorOutput(documents!);
  };

  const { form } = useForm({
    schema: documentsSchema,
    defaultValue: {
      documents: cachedDocuments || '',
    },
  });

  return (
    <>
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.ingestPipelines.testPipelineFlyout.documentsTab.tabDescriptionText"
            defaultMessage="Provide an array of documents for the pipeline to ingest. {learnMoreLink}"
            values={{
              learnMoreLink: (
                <EuiLink
                  href={`${links.esDocsBasePath}/simulate-pipeline-api.html`}
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
        onSubmit={executePipeline}
        error={form.getErrors()}
      >
        {/* Documents editor */}
        <UseField
          path="documents"
          component={JsonEditorField}
          componentProps={{
            ['data-test-subj']: 'documentsField',
            euiCodeEditorProps: {
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
          onClick={executePipeline}
          size="s"
          isLoading={isExecuting}
          disabled={form.isSubmitted && !form.isValid}
        >
          {isExecuting ? (
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
    </>
  );
};
