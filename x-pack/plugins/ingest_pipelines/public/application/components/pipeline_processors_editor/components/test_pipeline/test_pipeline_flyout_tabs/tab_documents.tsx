/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import { EuiSpacer, EuiText, EuiButton, EuiLink } from '@elastic/eui';

import { getUseField, Field, JsonEditorField, useKibana } from '../../../../../../shared_imports';

const UseField = getUseField({ component: Field });

interface Props {
  validateAndTestPipeline: () => Promise<void>;
  isRunningTest: boolean;
  isSubmitButtonDisabled: boolean;
}

export const DocumentsTab: React.FunctionComponent<Props> = ({
  validateAndTestPipeline,
  isSubmitButtonDisabled,
  isRunningTest,
}) => {
  const { services } = useKibana();

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
        disabled={isSubmitButtonDisabled}
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
  );
};
