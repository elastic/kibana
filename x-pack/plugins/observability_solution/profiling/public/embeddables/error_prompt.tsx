/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export function ErrorPrompt() {
  return (
    <EuiEmptyPrompt
      color="warning"
      iconType="warning"
      titleSize="xs"
      title={
        <h2>
          {i18n.translate('xpack.profiling.embeddables.loadErrorTitle', {
            defaultMessage: 'Unable to load the Profiling data',
          })}
        </h2>
      }
      body={
        <p>
          {i18n.translate('xpack.profiling.embeddables.loadErrorBody', {
            defaultMessage:
              'There was an error while trying to load profiling data. Try refreshing the page',
          })}
        </p>
      }
    />
  );
}
