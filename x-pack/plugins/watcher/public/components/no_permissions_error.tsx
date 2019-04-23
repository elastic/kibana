/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export function NoPermissionsError() {
  return (
    <EuiEmptyPrompt
      iconType="securityApp"
      iconColor={undefined}
      title={
        <h2>
          <FormattedMessage
            id="xpack.watcher.noPermissionsError.deniedPermissionTitle"
            defaultMessage="You don't have privileges to use Watcher"
          />
        </h2>
      }
    />
  );
}
