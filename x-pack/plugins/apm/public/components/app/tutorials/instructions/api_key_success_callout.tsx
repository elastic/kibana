/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export function ApiKeySuccessCallout() {
  return (
    <EuiCallOut
      title={i18n.translate('xpack.apm.tutorial.apiKey.success.calloutTitle', {
        defaultMessage: 'API key created',
      })}
      color="success"
      iconType="check"
    >
      {i18n.translate('xpack.apm.tutorial.apiKey.success.calloutMessage', {
        defaultMessage: `Remember to store this information in a safe place. It won't be displayed anymore after you continue`,
      })}
    </EuiCallOut>
  );
}
