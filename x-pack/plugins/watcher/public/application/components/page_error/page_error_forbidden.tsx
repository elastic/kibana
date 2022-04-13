/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export function PageErrorForbidden() {
  return (
    <EuiEmptyPrompt
      iconType="alert"
      title={
        <h1>
          <FormattedMessage
            id="xpack.watcher.pageErrorForbidden.title"
            defaultMessage="You don't have privileges to use Watcher"
          />
        </h1>
      }
    />
  );
}
