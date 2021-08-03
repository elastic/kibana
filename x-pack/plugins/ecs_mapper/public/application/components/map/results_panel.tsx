/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import React, { FC } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiButton,
  EuiPanel
} from '@elastic/eui';

interface Props {
  pipelineName: string;
  onManageIngestPipeline(): void;
}

export const ResultsPanel: FC<Props> = ({ pipelineName, onManageIngestPipeline }) =>  {
  return (
    <EuiPanel color="subdued" borderRadius="none">
      <EuiFlexGroup gutterSize="xl">
        <EuiFlexItem grow={true}>
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.ecsMapper.file.informational.instructions"
                defaultMessage="Import successful!"
              />
            </p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiButton className="euiButton--success"
            target="_self"
            onClick={() => onManageIngestPipeline()}
            data-test-subj="ecsMapperManagePipelineButton"
            >
            <FormattedMessage
              id="xpack.ecsMapper.manageIngestPipeline"
              defaultMessage="Manage {pipelineName}"
              values={{ pipelineName }}
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};