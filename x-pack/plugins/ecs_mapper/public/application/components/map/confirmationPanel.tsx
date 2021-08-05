/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiCodeBlock, EuiPanel, EuiSpacer, EuiButton, EuiTitle } from '@elastic/eui';

interface Props {
  pipelineName: string;
  processors: object[];
  onCreatePipeline(): void;
}

export const ConfirmationPanel: FC<Props> = ({ pipelineName, processors, onCreatePipeline }) => {
  return (
    <EuiPanel color="subdued" borderRadius="none">
      <EuiTitle>
        <h2>{pipelineName} preview</h2>
      </EuiTitle>
      <EuiCodeBlock language="json" overflowHeight={300} isCopyable>
        {JSON.stringify(processors, null, 2)}
      </EuiCodeBlock>

      <EuiSpacer size="m" />
          <EuiButton
            target="_self"
            onClick={() => onCreatePipeline()}
            data-test-subj="ecsMapperCreateIngestPipelineButton"
          >
            <FormattedMessage
              id="xpack.ecsMapper.createIngestPipeline"
              defaultMessage="Create"
            />
          </EuiButton>
    </EuiPanel>
  );
};
