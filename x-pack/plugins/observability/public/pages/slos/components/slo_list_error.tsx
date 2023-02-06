/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export function SloListError() {
  return (
    <EuiEmptyPrompt
      iconType="alert"
      color="danger"
      title={
        <h2>
          {i18n.translate('xpack.observability.slos.list.errorTitle', {
            defaultMessage: 'Unable to load SLOs',
          })}
        </h2>
      }
      body={
        <p>
          {i18n.translate('xpack.observability.slos.list.errorMessage', {
            defaultMessage:
              'There was an error loading the SLOs. Contact your administrator for help.',
          })}
        </p>
      }
    />
  );
}
