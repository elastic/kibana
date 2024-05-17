/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export function PermissionDenied() {
  return (
    <EuiEmptyPrompt
      iconType="securityApp"
      title={
        <h2>
          {i18n.translate('xpack.apm.settings.agentKeys.noPermissionToManagelApiKeysTitle', {
            defaultMessage: 'You need permission to manage API keys',
          })}
        </h2>
      }
      body={
        <p>
          {i18n.translate('xpack.apm.settings.agentKeys.noPermissionToManagelApiKeysDescription', {
            defaultMessage: 'Contact your system administrator',
          })}
        </p>
      }
    />
  );
}
