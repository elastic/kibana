/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiCodeBlock,
  EuiSpacer,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCard,
  EuiIcon,
} from '@elastic/eui';

interface Props {
  processors: object[];
  onDownload(): void;
  onClickToCreatePipeline(): void;
  isCreatingPipeline: boolean;
}

export const PreviewPanel: FC<Props> = ({
  processors,
  onDownload,
  onClickToCreatePipeline,
  isCreatingPipeline
}) => {
  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiTitle>
          <h2>Mapping</h2>
        </EuiTitle>

        <EuiSpacer size="m" />

        <EuiCodeBlock language="json" overflowHeight={500} isCopyable>
          {JSON.stringify(processors, null, 2)}
        </EuiCodeBlock>

        <EuiSpacer size="xl" />

        {!isCreatingPipeline && (
         <EuiFlexGroup>
          <EuiFlexItem>
            <EuiCard
              icon={<EuiIcon size="xxl" type={`download`} />}
              data-test-subj="downloadPipelineProcessors"
              title={
                <FormattedMessage
                  id="xpack.ecsMapper.preview.download"
                  defaultMessage="Download"
                />
              }
              description=""
              onClick={onDownload}
            />
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiCard
              icon={<EuiIcon size="xxl" type={`gear`} />}
              data-test-subj="createIngestNodePipeline"
              title={
                <FormattedMessage
                  id="xpack.ecsMapper.preview.createPipeline"
                  defaultMessage="Create Ingest Node pipeline"
                />
              }
              description=""
              onClick={onClickToCreatePipeline}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
