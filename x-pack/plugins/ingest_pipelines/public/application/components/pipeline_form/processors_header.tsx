/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { useKibana } from '../../../shared_imports';

import {
  LoadFromJsonButton,
  OnDoneLoadJsonHandler,
  TestPipelineActions,
} from '../pipeline_processors_editor';

export interface Props {
  onLoadJson: OnDoneLoadJsonHandler;
}

export const ProcessorsHeader: FunctionComponent<Props> = ({ onLoadJson }) => {
  const { services } = useKibana();

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="s"
      justifyContent="spaceBetween"
      responsive={false}
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs">
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h3>
                {i18n.translate('xpack.ingestPipelines.pipelineEditor.processorsTreeTitle', {
                  defaultMessage: 'Processors',
                })}
              </h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <LoadFromJsonButton onDone={onLoadJson} />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.ingestPipelines.pipelineEditor.processorsTreeDescription"
            defaultMessage="The processors used to pre-process documents before indexing. {learnMoreLink}"
            values={{
              learnMoreLink: (
                <EuiLink
                  href={services.documentation.getEsDocsBasePath() + '/ingest-processors.html'}
                  target="_blank"
                  external
                >
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
        <TestPipelineActions />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
