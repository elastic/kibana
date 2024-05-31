/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export function DisabledPrompt() {
  return (
    <EuiEmptyPrompt
      iconType="eyeClosed"
      iconColor="subdued"
      title={
        <h2>
          {i18n.translate('xpack.apm.serviceMap.disabledTitle', {
            defaultMessage: 'Service Map is disabled',
          })}
        </h2>
      }
      body={
        <p>
          {i18n.translate('xpack.apm.serviceMap.disabledDescription', {
            defaultMessage:
              'The service map has been disabled. It can be enabled via `xpack.apm.serviceMapEnabled`',
          })}
        </p>
      }
    />
  );
}
