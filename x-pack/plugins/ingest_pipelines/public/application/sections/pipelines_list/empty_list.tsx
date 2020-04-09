/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';

interface Props {
  onClick: () => void;
}

export const EmptyList: FunctionComponent<Props> = ({ onClick }) => (
  <EuiEmptyPrompt
    iconType="managementApp"
    title={
      <h2>
        {i18n.translate('xpack.ingestPipelines.list.table.emptyPromptTitle', {
          defaultMessage: 'Create your first pipeline',
        })}
      </h2>
    }
    actions={
      <EuiButton onClick={onClick}>
        {i18n.translate('xpack.ingestPipelines.list.table.emptyPrompt.createButtonLabel', {
          defaultMessage: 'Create pipeline',
        })}
      </EuiButton>
    }
  />
);
