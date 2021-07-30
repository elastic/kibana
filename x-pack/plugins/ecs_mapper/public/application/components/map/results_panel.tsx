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
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiText,
  EuiButton,
} from '@elastic/eui';

interface Props {
  pipelineName: string;
  onManageIngestPipeline(): void;
}

export const ResultsPanel: FC<Props> = ({ pipelineName, onManageIngestPipeline }) =>  {
  return (
    <EuiPage className="prfDevTool__page mapper-main" data-test-subj="ecsMapperResultsLoaded">
      <EuiPageBody className="prfDevTool__page__pageBody">
        <EuiPageContent className="prfDevTool__page__pageBodyContent">
          <EuiFlexGroup gutterSize="xl">
            <EuiFlexItem grow={true}>
              <EuiText>
                <p>
                  <FormattedMessage
                    id="xpack.ecsMapper.file.informational.instructions"
                    defaultMessage="Import successful for {pipelineName}"
                    values={{ pipelineName }}
                  />
                </p>
              </EuiText>
              <EuiSpacer size="m" />
              <EuiButton
                target="_self"
                onClick={() => onManageIngestPipeline()}
                data-test-subj="ecsMapperManagePipelineButton"
                >
                <FormattedMessage
                  id="xpack.ecsMapper.manageIngestPipeline"
                  defaultMessage="Manage pipeline"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};