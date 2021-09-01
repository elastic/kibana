/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { FC, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiFieldText,
} from '@elastic/eui';

interface Props {
  onCreatePipeline(pipelineName: string): void;
  onCancel(): void;
  isPipelineCreated: boolean;
}

export const CreatePipelinePanel: FC<Props> = ({
  onCreatePipeline,
  onCancel,
  isPipelineCreated,
}) => {
  const [pipelineName, setPipelineName] = useState('');
  const [hasSubmitted] = useState<boolean>(false);
  const hasPipelineName = !!pipelineName || !!pipelineName.trim();

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiDescribedFormGroup
          title={
            <h3>
              <FormattedMessage
                id="xpack.ecsMapper.file.upload.pipelineName.title"
                defaultMessage="Ingest Node Pipeline name"
              />
            </h3>
          }
          description={
            <p>
              <FormattedMessage
                id="xpack.ecsMapper.file.upload.pipelineName.description"
                defaultMessage="This is the name for the Ingest Node Pipeline that will be created from the CSV mapping."
              />
            </p>
          }
        >
          <EuiFormRow
            fullWidth
            isInvalid={hasSubmitted && !hasPipelineName}
            error={
              !hasPipelineName
                ? i18n.translate('xpack.ecsMapper.file.upload.pipelineName.nameErrorMessage', {
                    defaultMessage: 'Name is required.',
                  })
                : null
            }
            hasEmptyLabelSpace
          >
            <EuiFieldText
              onChange={(e) => {
                setPipelineName(e.target.value);
              }}
              isInvalid={hasSubmitted && !hasPipelineName}
            />
          </EuiFormRow>
        </EuiDescribedFormGroup>

        {!isPipelineCreated && (
          <EuiFlexGroup wrap>
            <EuiFlexItem grow={false}>
              <EuiButton
                target="_self"
                onClick={() => onCreatePipeline(pipelineName)}
                data-test-subj="ecsMapperCreateIngestPipelineButton"
                color="primary"
                fill
              >
                <FormattedMessage
                  id="xpack.ecsMapper.createIngestPipeline"
                  defaultMessage="Create pipeline"
                />
              </EuiButton>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
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
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
