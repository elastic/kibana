/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiPanel } from '@elastic/eui';

import { BACK_LABEL } from '../../../../common/i18n_string';
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
        {BACK_LABEL}
      </EuiButtonEmpty>
      <EmptyConnectorsPrompt />
    </EuiPanel>
  );
};
