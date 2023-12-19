/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiPanel } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { EmptyConnectorsPrompt } from '../connectors/empty_connectors_prompt';

interface ConnectorIndexEmptyPromptProps {
  indexName: string;
  onBackClick?: () => void;
}

export const ConnectorIndexEmptyPrompt = ({ onBackClick }: ConnectorIndexEmptyPromptProps) => {
  return (
    <EuiPanel>
      <EuiButtonEmpty
        data-test-subj="serverlessSearchConnectorIndexEmptyPromptBackButton"
        onClick={onBackClick}
        iconSide="left"
        iconType="arrowLeft"
      >
        <FormattedMessage
          id="xpack.serverlessSearch.indexManagement.indexDetails.overview.emptyPrompt.connector.backBtn"
          defaultMessage="Back"
        />
      </EuiButtonEmpty>
      <EmptyConnectorsPrompt />
    </EuiPanel>
  );
};
