/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import React, { FC } from 'react';
import { EuiCallOut, EuiText, EuiLink } from '@elastic/eui';

interface Props {
  pipelineName: string;
  onManageIngestPipeline(): void;
}

export const ResultsPanel: FC<Props> = ({ pipelineName, onManageIngestPipeline }) => {
  return (
    <EuiCallOut title="Import complete" color="success" iconType="check">
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.ecsMapper.results.information"
            defaultMessage="ECS Mapper has imported new ingest node pipeline. 
            Click&nbsp;{managementLink} to manage it within Stack Management."
            values={{
              managementLink: (
                <EuiLink
                  target="_blank"
                  onClick={() => {onManageIngestPipeline()}}
                >
                  here
                </EuiLink>
              ),
              pipelineName
            }}
          />
        </p>
      </EuiText>
    </EuiCallOut>
  );
};
