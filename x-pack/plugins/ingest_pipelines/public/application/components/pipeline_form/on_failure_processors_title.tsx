/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiText, EuiTitle } from '@elastic/eui';
import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { useKibana } from '../../../shared_imports';

export const OnFailureProcessorsTitle: FunctionComponent = () => {
  const { services } = useKibana();
  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="none"
      justifyContent="spaceBetween"
      responsive={false}
    >
      <EuiFlexItem>
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.ingestPipelines.pipelineEditor.onFailureTreeTitle"
              defaultMessage="Failure processors"
            />
          </h3>
        </EuiTitle>
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.ingestPipelines.pipelineEditor.onFailureTreeDescription"
            defaultMessage="The processors used to handle exceptions in this pipeline. {learnMoreLink}"
            values={{
              learnMoreLink: (
                <EuiLink
                  href={
                    services.documentation.getEsDocsBasePath() +
                    '/handling-failure-in-pipelines.html'
                  }
                  target="_blank"
                >
                  {i18n.translate(
                    'xpack.ingestPipelines.pipelineEditor.onFailureProcessorsDocumentationLink',
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
    </EuiFlexGroup>
  );
};
