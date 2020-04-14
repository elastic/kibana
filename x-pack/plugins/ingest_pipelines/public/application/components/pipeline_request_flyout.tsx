/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { Pipeline } from '../../../common/types';

interface Props {
  pipeline: Pipeline;
  closeFlyout: () => void;
}

export const PipelineRequestFlyout: React.FunctionComponent<Props> = ({
  closeFlyout,
  pipeline,
}) => {
  const { name, ...pipelineBody } = pipeline;
  const endpoint = `PUT _ingest/pipeline/${name || '<pipelineName>'}`;
  const payload = JSON.stringify(pipelineBody, null, 2);
  const request = `${endpoint}\n${payload}`;

  return (
    <EuiFlyout maxWidth={480} onClose={closeFlyout}>
      <EuiFlyoutHeader>
        <EuiTitle>
          <h2>
            {name ? (
              <FormattedMessage
                id="xpack.ingestPipelines.requestFlyout.namedTitle"
                defaultMessage="Request for '{name}'"
                values={{ name }}
              />
            ) : (
              <FormattedMessage
                id="xpack.ingestPipelines.requestFlyout.unnamedTitle"
                defaultMessage="Request"
              />
            )}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.ingestPipelines.requestFlyout.descriptionText"
              defaultMessage="This Elasticsearch request will create or update this pipeline."
            />
          </p>
        </EuiText>

        <EuiSpacer />

        <EuiCodeBlock language="json" isCopyable>
          {request}
        </EuiCodeBlock>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiButtonEmpty iconType="cross" onClick={closeFlyout} flush="left">
          <FormattedMessage
            id="xpack.ingestPipelines.requestFlyout.closeButtonLabel"
            defaultMessage="Close"
          />
        </EuiButtonEmpty>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
