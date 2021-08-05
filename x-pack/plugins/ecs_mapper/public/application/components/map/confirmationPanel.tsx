/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiCodeBlock, EuiSpacer, EuiButton, EuiTitle, EuiFlexGroup, EuiFlexItem, EuiText, EuiButtonEmpty } from '@elastic/eui';

interface Props {
  pipelineName: string;
  processors: object[];
  onCreatePipeline(): void;
  onCancel(): void;
}

export const ConfirmationPanel: FC<Props> = ({ pipelineName, processors, onCreatePipeline, onCancel }) => {
  return (
    <EuiFlexGroup>
      <EuiFlexItem>

        <EuiTitle>
          <h2>Preview: {pipelineName}</h2>
        </EuiTitle>

        <EuiSpacer size="m" />

        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.ecsMapper.confirmation.message"
              defaultMessage="Below is the JSON that ECS Mapper will utilize to create your starter pipeline."
            />
          </p>
        </EuiText>

        <EuiSpacer size="m" />

        <EuiCodeBlock language="json" overflowHeight={300} isCopyable>
          {JSON.stringify(processors, null, 2)}
        </EuiCodeBlock>

        <EuiSpacer size="m" />
        
        <EuiButton
          target="_self"
          onClick={() => onCreatePipeline()}
          data-test-subj="ecsMapperCreateIngestPipelineButton"
          color="primary"
          fill
        >
          <FormattedMessage
            id="xpack.ecsMapper.createIngestPipeline"
            defaultMessage="Confirm"
          />
        </EuiButton>

        <EuiButtonEmpty
          onClick={() => onCancel()}
          data-test-subj="ecsMapperCancelIngestPipelineButton" 
        >
          <FormattedMessage
            id="xpack.ecsMapper.cancelCreateIngestPipeline"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>

      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
