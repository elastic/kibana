/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { EuiPageContent, EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { DeprecationSource } from '../../../../common/types';

interface Props {
  deprecationSource: DeprecationSource;
  message?: string;
}

export const DeprecationsPageLoadingError: FunctionComponent<Props> = ({
  deprecationSource,
  message,
}) => (
  <EuiPageContent
    verticalPosition="center"
    horizontalPosition="center"
    color="danger"
    data-test-subj="deprecationsPageLoadingError"
  >
    <EuiEmptyPrompt
      iconType="alert"
      title={
        <h2>
          {i18n.translate('xpack.upgradeAssistant.deprecationsPageLoadingError.title', {
            defaultMessage: 'Could not retrieve {deprecationSource} deprecation issues',
            values: { deprecationSource },
          })}
        </h2>
      }
      body={message}
    />
  </EuiPageContent>
);
