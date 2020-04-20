/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { BASE_PATH } from '../../../../common/constants';

export const EmptyList: FunctionComponent = () => (
  <EuiEmptyPrompt
    iconType="managementApp"
    title={
      <h2>
        {i18n.translate('xpack.ingestPipelines.list.table.emptyPromptTitle', {
          defaultMessage: 'Start by creating a pipeline',
        })}
      </h2>
    }
    actions={
      <EuiButton href={`#${BASE_PATH}/create`} iconType="plusInCircle" fill>
        {i18n.translate('xpack.ingestPipelines.list.table.emptyPrompt.createButtonLabel', {
          defaultMessage: 'Create a pipeline',
        })}
      </EuiButton>
    }
  />
);
