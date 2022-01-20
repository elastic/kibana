/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { useKibana } from '../../../../shared_imports';

import { LoadFromJsonButton, OnDoneLoadJsonHandler, TestPipelineActions } from './';

export interface Props {
  onLoadJson: OnDoneLoadJsonHandler;
  hasProcessors: boolean;
}

export const ProcessorsHeader: FunctionComponent<Props> = ({ onLoadJson, hasProcessors }) => {
  const { services } = useKibana();

  const ProcessorTitle: FunctionComponent = () => (
    <EuiTitle size="s">
      <h3>
        {i18n.translate('xpack.ingestPipelines.pipelineEditor.processorsTreeTitle', {
          defaultMessage: 'Processors',
        })}
      </h3>
    </EuiTitle>
  );

  if (!hasProcessors) {
    return <ProcessorTitle />;
  }

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
            <ProcessorTitle />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <LoadFromJsonButton onDone={onLoadJson} />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.ingestPipelines.pipelineEditor.processorsTreeDescription"
            defaultMessage="Use processors to transform data before indexing. {learnMoreLink}"
            values={{
              learnMoreLink: (
                <EuiLink href={services.documentation.getProcessorsUrl()} target="_blank" external>
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
