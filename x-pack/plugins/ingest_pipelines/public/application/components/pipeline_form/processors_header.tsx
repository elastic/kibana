/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiLink, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { usePipelineProcessorsContext } from '../pipeline_processors_editor/context';

import { LoadFromJsonButton, OnDoneLoadJsonHandler } from '../pipeline_processors_editor';

export interface Props {
  onTestPipelineClick: () => void;
  isTestButtonDisabled: boolean;
  onLoadJson: OnDoneLoadJsonHandler;
}

export const ProcessorsHeader: FunctionComponent<Props> = ({
  onTestPipelineClick,
  isTestButtonDisabled,
  onLoadJson,
}) => {
  const { links } = usePipelineProcessorsContext();
  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="s"
      justifyContent="spaceBetween"
      responsive={false}
    >
      <EuiFlexItem>
        <EuiTitle size="s">
          <h3>
            {i18n.translate('xpack.ingestPipelines.pipelineEditor.processorsTreeTitle', {
              defaultMessage: 'Processors',
            })}
          </h3>
        </EuiTitle>
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.ingestPipelines.pipelineEditor.processorsTreeDescription"
            defaultMessage="The processors used to pre-process documents before indexing. {learnMoreLink}"
            values={{
              learnMoreLink: (
                <EuiLink href={links.esDocsBasePath + '/ingest-processors.html'} target="_blank">
                  {i18n.translate(
                    'xpack.ingestPipelines.pipelineEditor.processorsDocumentationLink',
                    {
                      defaultMessage: 'Learn more.',
                    }
                  )}
                </EuiLink>
              ),
            }}
          />
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <LoadFromJsonButton onDone={onLoadJson} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          data-test-subj="testPipelineButton"
          size="s"
          onClick={onTestPipelineClick}
          disabled={isTestButtonDisabled}
        >
          <FormattedMessage
            id="xpack.ingestPipelines.pipelineEditor.testPipelineButtonLabel"
            defaultMessage="Test pipeline"
          />
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
